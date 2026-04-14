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

const app = express();
const server = http.createServer(app);

// WebSocket server for terminal/live features
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'Nightmare Console connected' }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleWsMessage(ws, msg);
    } catch (err) {
      console.error('WebSocket message parse error:', err.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
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
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter for file system and AI routes (prevent abuse)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// API routes
app.use('/api/ai', apiLimiter, aiRouter);
app.use('/api/plugins', pluginsRouter);

// File system API
app.get('/api/files', apiLimiter, (req, res) => {
  const dir = path.resolve(req.query.path || process.cwd());
  // Restrict to current working directory subtree for safety
  const cwd = process.cwd();
  if (!dir.startsWith(cwd)) {
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
  const filePath = path.resolve(req.query.path || '');
  const cwd = process.cwd();
  if (!filePath.startsWith(cwd)) {
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
  if (!resolved.startsWith(cwd)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content || '', 'utf8');
    res.json({ success: true, path: resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', name: 'Nightmare Code Console' });
});

// Catch-all: serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🩸 Nightmare Code Console running at http://localhost:${PORT}`);
  console.log('   Press Ctrl+C to stop\n');
});

module.exports = { app, server };

