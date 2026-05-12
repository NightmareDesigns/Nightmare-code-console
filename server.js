'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const aiRouter = require('./ai');
const pluginsRouter = require('./plugins');
const gitRouter = require('./git');

// ── Constants ──────────────────────────────────────────────
const JSON_BODY_LIMIT = '10mb';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 120; // requests per window

const app = express();
const server = http.createServer(app);

// Prefer prebuilt dist/ assets for standalone/packaged builds; fallback to public/
const useDist = fs.existsSync(path.join(__dirname, 'dist'));
const staticRoot = path.join(__dirname, useDist ? 'dist' : 'public');

// ── Helpers ──────────────────────────────────────────────────

/**
 * Validates that a resolved path is inside the base directory.
 * Uses realpath to resolve symlinks and prevent traversal attacks.
 *
 * @param {string} baseDir - Base directory to check against
 * @param {string} targetPath - Target path to validate
 * @returns {boolean} True if target is inside base, false otherwise
 *
 * @security Resolves symlinks to prevent bypassing via symbolic links
 */
function isPathInsideBase(baseDir, targetPath) {
  const resolvedBase = fs.realpathSync(baseDir);
  let resolvedTarget;

  try {
    resolvedTarget = fs.realpathSync(targetPath);
  } catch {
    // Target may not exist yet (e.g., new file writes); fall back to resolved path
    resolvedTarget = path.resolve(targetPath);
  }

  const relativePath = path.relative(resolvedBase, resolvedTarget);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

// WebSocket server for terminal/live features
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'Nightmare Console connected' }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleWsMessage(ws, msg);
    } catch (err) {
      console.error('[WebSocket] Message parse error:', err.message, '| Data:', data.toString().slice(0, 100));
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Connection error:', err.message);
  });
});

function handleWsMessage(ws, msg) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'echo':
      ws.send(JSON.stringify({ type: 'echo', data: msg.data }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'unknown', received: msg.type }));
  }
}

app.use(cors());
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.static(staticRoot));

// Serve vendored frontend dependencies
if (useDist) {
  app.use('/vendor', express.static(path.join(staticRoot, 'vendor')));
} else {
  app.use('/vendor/monaco', express.static(path.join(__dirname, 'node_modules/monaco-editor/min')));
  app.use('/vendor/marked', express.static(path.join(__dirname, 'node_modules/marked')));
  app.use('/vendor/hljs', express.static(path.join(__dirname, 'node_modules/highlight.js')));
  app.use('/vendor/xterm', express.static(path.join(__dirname, 'node_modules/xterm')));
  app.use('/vendor/xterm-fit', express.static(path.join(__dirname, 'node_modules/xterm-addon-fit')));
}

// Rate limiter for file system and AI routes (prevent abuse)
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// API routes
app.use('/api/ai', apiLimiter, aiRouter);
app.use('/api/plugins', pluginsRouter);
app.use('/api/git', apiLimiter, gitRouter);

// File system API
app.get('/api/files', apiLimiter, (req, res) => {
  const cwd = process.cwd();
  const dir = path.resolve(req.query.path || cwd);
  // Restrict to current working directory subtree for safety
  if (!isPathInsideBase(cwd, dir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const items = entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file',
      path: path.join(dir, e.name),
    }));
    res.json({ path: dir, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/file', apiLimiter, (req, res) => {
  const cwd = process.cwd();
  const filePath = path.resolve(req.query.path || '');
  if (!isPathInsideBase(cwd, filePath)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ path: filePath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/file', apiLimiter, (req, res) => {
  const { path: filePath, content } = req.body;
  const resolved = path.resolve(filePath || '');
  const cwd = process.cwd();
  if (!isPathInsideBase(cwd, resolved)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  // Limit file size to prevent DoS
  if (content && content.length > MAX_FILE_SIZE) {
    return res.status(413).json({ error: 'File content exceeds maximum size (50MB)' });
  }
  try {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content || '', 'utf8');
    res.json({ success: true, path: resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check (light rate limit to prevent abuse)
app.get('/api/health', apiLimiter, (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', name: 'Nightmare Code Console' });
});

// Catch-all: serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🩸 Nightmare Code Console running at http://localhost:${PORT}`);
  console.log('   Press Ctrl+C to stop\n');
});

module.exports = { app, server };
