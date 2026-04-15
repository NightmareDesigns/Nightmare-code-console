'use strict';

const express = require('express');
const router = express.Router();

const DEFAULT_AI_API_URL = 'https://api.openai.com/v1/chat/completions';
const envMockFlag = process.env.AI_MOCK_MODE === 'true';
const preferLocal = process.env.AI_PREFER_LOCAL === 'true';
const localUrl = process.env.AI_LOCAL_URL || 'http://127.0.0.1:11434/v1/chat/completions';
const localModel = process.env.AI_LOCAL_MODEL || 'codellama:7b';
const localApiKey = process.env.AI_LOCAL_API_KEY || '';

let aiApiUrl = process.env.AI_API_URL || DEFAULT_AI_API_URL;
let aiApiKey = process.env.AI_API_KEY || '';
let aiModel = process.env.AI_MODEL || 'gpt-3.5-turbo';
let aiMockMode = envMockFlag || !aiApiKey || aiApiKey === 'your_api_key_here';

// For desktop (Windows/macOS/Linux) users who want local AI by default,
// allow opting in without forcing AI_MOCK_MODE=false or an API key.
if (preferLocal && !envMockFlag && (!process.env.AI_API_URL || aiApiUrl === DEFAULT_AI_API_URL)) {
  aiApiUrl = localUrl;
  aiApiKey = localApiKey;
  aiModel = localModel;
  aiMockMode = false;
}

// Compute the effective config for this request (env defaults + client overrides)
function resolveConfig(body = {}) {
  const client = body.clientConfig || {};
  const useLocal = client.useLocal === true || client.useLocal === 'true';

  const providedKey = client.apiKey !== undefined ? client.apiKey : body.apiKey;
  const providedUrl = client.apiUrl || body.apiUrl;
  const providedModel = client.model || body.model;

  let apiUrl = aiApiUrl;
  let apiKey = aiApiKey;
  let model = aiModel;

  if (useLocal) {
    apiUrl = client.localUrl || localUrl;
    model = client.localModel || localModel;
    apiKey = client.localApiKey || '';
  } else {
    if (providedUrl) apiUrl = providedUrl;
    if (providedModel) model = providedModel;
    if (providedKey !== undefined) apiKey = providedKey;
  }

  const isLocalEndpoint = /localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|192\.168\.\d+\.\d+/.test(apiUrl);

  // Env mock flag wins unless the user explicitly opts into local mode
  let mockMode = envMockFlag && !useLocal;
  if (!mockMode) {
    mockMode = !apiKey && !isLocalEndpoint;
  }

  const mode = mockMode ? 'MOCK' : (isLocalEndpoint ? 'LOCAL' : 'LIVE');

  return {
    apiUrl,
    apiKey,
    model,
    mockMode,
    mode,
    isLocalEndpoint,
    usedLocal: useLocal,
    hasKey: Boolean(apiKey),
  };
}

// System prompt that gives the AI context about the Nightmare Code Console
const SYSTEM_PROMPT = `You are NightmareAI, an advanced coding assistant built into the Nightmare Code Console — 
a dark-themed, horror-inspired AI-powered code editor. You help developers write, debug, review, and 
understand code across all programming languages. You are knowledgeable, precise, and slightly gothic in tone. 
Always format code with proper markdown code blocks using the appropriate language identifier. 
Keep explanations concise but thorough.`;

// Mock responses for demo mode
const MOCK_RESPONSES = [
  "I can help you with that code! To enable full AI functionality, configure your API key in the `.env` file. Here's a quick example:\n\n```javascript\n// Example: Hello World\nconsole.log('Welcome to Nightmare Code Console');\n```",
  "Great question! In **mock mode**, I can demonstrate responses. Set `AI_API_KEY` in your `.env` file to enable real AI assistance.\n\n```python\n# Python example\nprint('Nightmare Code Console - AI Powered')\n```",
  "I'm running in **demo mode**. Configure your OpenAI-compatible API key to unlock full AI capabilities. The editor supports syntax highlighting for 80+ languages!",
  "Here's a code snippet to get you started:\n\n```typescript\ninterface NightmarePlugin {\n  name: string;\n  language: string;\n  activate(): void;\n}\n```\n\nAdd your API key to `.env` for real AI-powered code assistance!",
];

let mockIndex = 0;

router.post('/chat', async (req, res) => {
  const { messages, context } = req.body;
  const cfg = resolveConfig(req.body || {});

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Build the messages array with system prompt
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.slice(-20), // keep last 20 messages to avoid token overflow
  ];

  // Add editor context if provided
  if (context && context.code) {
    const lang = context.language || 'plaintext';
    apiMessages.splice(1, 0, {
      role: 'system',
      content: `Current editor context:\nLanguage: ${lang}\nFile: ${context.filename || 'untitled'}\n\nCode:\n\`\`\`${lang}\n${context.code.slice(0, 4000)}\n\`\`\``,
    });
  }

  if (cfg.mockMode) {
    // Simulate delay
    await new Promise((r) => setTimeout(r, 600));
    const reply = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
    mockIndex++;
    return res.json({
      role: 'assistant',
      content: reply,
      mock: true,
      mode: cfg.mode,
      apiUrl: null,
      model: cfg.model,
    });
  }

  try {
    const fetch = require('node-fetch');
    const headers = { 'Content-Type': 'application/json' };
    // Only send Authorization header when a key is present
    // (Ollama and LM Studio don't require one)
    if (cfg.apiKey) {
      headers['Authorization'] = `Bearer ${cfg.apiKey}`;
    }
    const response = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      return res.status(502).json({ error: `AI API error: ${response.status}` });
    }

    const data = await response.json();
    const message = data.choices && data.choices[0] && data.choices[0].message;
    if (!message) {
      return res.status(502).json({ error: 'Invalid AI API response' });
    }

    res.json({
      role: message.role,
      content: message.content,
      mock: false,
      mode: cfg.mode,
      apiUrl: cfg.apiUrl,
      model: cfg.model,
    });
  } catch (err) {
    console.error('AI fetch error:', err.message);
    // Give a more helpful error when a local server is configured but unreachable
    if (cfg.isLocalEndpoint && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) {
      return res.status(503).json({
        error: `Local AI server not reachable at ${cfg.apiUrl}. ` +
          'Make sure your local AI server (Ollama, LM Studio, or llama.cpp) is running. ' +
          'For Ollama: ollama serve && ollama pull codellama:7b',
      });
    }
    res.status(500).json({ error: 'Failed to reach AI service' });
  }
});

// Return current AI config (without the API key)
router.get('/config', (req, res) => {
  const current = resolveConfig({});
  res.json({
    model: aiModel,
    mockMode: current.mockMode,
    apiConfigured: !current.mockMode,
    isLocalEndpoint: current.isLocalEndpoint,
    apiUrl: current.mockMode ? null : current.apiUrl,
    preferLocal,
    localDefaults: preferLocal ? { url: localUrl, model: localModel } : null,
    allowsClientConfig: true,
  });
});

// Lightweight resolver to preview how the server will route a request with client-provided settings
router.post('/config/resolve', (req, res) => {
  const resolved = resolveConfig(req.body || {});
  res.json({
    mode: resolved.mode,
    mockMode: resolved.mockMode,
    apiUrl: resolved.mockMode ? null : resolved.apiUrl,
    model: resolved.model,
    isLocalEndpoint: resolved.isLocalEndpoint,
    usedLocal: resolved.usedLocal,
    apiKeyPresent: resolved.hasKey,
  });
});

module.exports = router;
