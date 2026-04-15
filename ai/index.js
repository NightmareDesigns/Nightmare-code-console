'use strict';

const express = require('express');
const router = express.Router();

const DEFAULT_AI_API_URL = 'https://api.openai.com/v1/chat/completions';
const envMockFlag = process.env.AI_MOCK_MODE === 'true';
const preferLocal = process.env.AI_PREFER_LOCAL === 'true';
const localUrl = process.env.AI_LOCAL_URL || 'http://127.0.0.1:11434/v1/chat/completions';
const localModel = process.env.AI_LOCAL_MODEL || 'codellama:7b';
const localApiKey = process.env.AI_LOCAL_API_KEY || '';
const geminiApiKey = process.env.AI_GEMINI_API_KEY || '';
const geminiModel = process.env.AI_GEMINI_MODEL || 'gemini-3.1-flash';
const copilotUrl = process.env.AI_COPILOT_URL || 'https://api.githubcopilot.com/chat/completions';
const copilotKey = process.env.AI_COPILOT_KEY || '';
const copilotModel = process.env.AI_COPILOT_MODEL || 'gpt-4o';
const defaultProviderFromEnv = process.env.AI_PROVIDER || (geminiApiKey ? 'gemini' : 'openai');
const DEFAULT_PROVIDER = defaultProviderFromEnv.toLowerCase();
const buildGeminiUrl = (modelName) => `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
const DEFAULT_GEMINI_URL = buildGeminiUrl(geminiModel);

let aiApiUrl = process.env.AI_API_URL || (DEFAULT_PROVIDER === 'gemini' ? DEFAULT_GEMINI_URL : DEFAULT_AI_API_URL);
let aiApiKey = process.env.AI_API_KEY || (DEFAULT_PROVIDER === 'gemini' ? geminiApiKey : '');
let aiModel = process.env.AI_MODEL || (DEFAULT_PROVIDER === 'gemini' ? geminiModel : 'gpt-3.5-turbo');
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
  const provider = (client.provider || body.provider || DEFAULT_PROVIDER || 'openai').toLowerCase();

  const providedKey = client.apiKey !== undefined ? client.apiKey : body.apiKey;
  const providedUrl = client.apiUrl || body.apiUrl;
  const providedModel = client.model || body.model;

  let apiUrl = aiApiUrl;
  let apiKey = aiApiKey;
  let model = aiModel;

  if (provider === 'gemini') {
    model = providedModel || geminiModel;
    apiKey = providedKey || geminiApiKey;
    apiUrl = providedUrl || buildGeminiUrl(model);
  } else if (provider === 'copilot') {
    model = providedModel || copilotModel;
    apiKey = providedKey || copilotKey;
    apiUrl = providedUrl || copilotUrl;
  } else if (useLocal) {
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

  const mode = mockMode ? 'MOCK' : (isLocalEndpoint ? 'LOCAL' : provider.toUpperCase());

  return {
    apiUrl,
    apiKey,
    model,
    mockMode,
    mode,
    isLocalEndpoint,
    usedLocal: useLocal,
    hasKey: Boolean(apiKey),
    provider,
  };
}

// System prompt that gives the AI context about the Nightmare Code Console
const SYSTEM_PROMPT = `You are NightmareAI, an advanced coding assistant built into the Nightmare Code Console — 
a dark-themed, horror-inspired AI-powered code editor. You help developers write, debug, review, and 
understand code across all programming languages. You are knowledgeable, precise, and slightly gothic in tone. 
Always format code with proper markdown code blocks using the appropriate language identifier. 
Keep explanations concise but thorough.`;

// Mock responses for demo mode
const MOCK_SNIPPETS = [
  { lang: 'javascript', code: "function greet(name){ return `Welcome, ${name}!`; }\nconsole.log(greet('Nightmare Hacker'));", hint: 'JS utility' },
  { lang: 'python', code: "def lint_paths(paths):\n    return [p for p in paths if p.endswith(('.py', '.pyw'))]\n\nprint(lint_paths(['main.py','README.md']))", hint: 'Filtering helper' },
  { lang: 'typescript', code: "type Plugin = { id: string; name: string; language: string };\nconst pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {\n  return keys.reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {} as Pick<T, K>);\n};", hint: 'TS util' },
];

function buildMockReply(messages, context, cfg) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const prompt = lastUser ? lastUser.content : 'your request';
  const snippet = MOCK_SNIPPETS[mockIndex % MOCK_SNIPPETS.length];
  mockIndex++;
  const ctxSummary = context && context.code
    ? `I also saw ${context.filename || 'your file'} (${context.language || 'plaintext'}) with ${context.code.split('\n').length} lines.`
    : 'Share code to get more specific help.';

  return [
    `Running in mock mode (${cfg.mode}). Here's a quick suggestion for "${prompt.slice(0, 80)}"...`,
    '',
    `- Provider: ${cfg.provider.toUpperCase()} (mock)`,
    `- Model: ${cfg.model}`,
    `- Endpoint: ${cfg.apiUrl || 'n/a'}`,
    `- Tip: add an API key in Settings → AI to enable live responses.`,
    '',
    ctxSummary,
    '',
    `Example (${snippet.hint}):`,
    '```' + snippet.lang + '\n' + snippet.code + '\n```',
  ].join('\n');
}

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
    await new Promise((r) => setTimeout(r, 300));
    const reply = buildMockReply(messages, context, cfg);
    return res.json({
      role: 'assistant',
      content: reply,
      mock: true,
      mode: cfg.mode,
      apiUrl: null,
      model: cfg.model,
      provider: cfg.provider,
    });
  }

  try {
    const fetch = require('node-fetch');

    if (cfg.provider === 'gemini') {
      const systemText = apiMessages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
      const userMessages = apiMessages.filter((m) => m.role !== 'system');
      const geminiMessages = userMessages.map((m, idx) => {
        const base = m.content || '';
        const content = idx === 0 && systemText ? `${systemText}\n\n${base}` : base;
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: content }],
        };
      });

      const response = await fetch(`${cfg.apiUrl}?key=${encodeURIComponent(cfg.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API error:', response.status, errText);
        return res.status(502).json({ error: `Gemini API error: ${response.status}` });
      }

      const data = await response.json();
      const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      const content = parts ? parts.map((p) => p.text || '').join('\n') : '';
      if (!content) {
        return res.status(502).json({ error: 'Invalid Gemini response' });
      }

      return res.json({
        role: 'assistant',
        content,
        mock: false,
        mode: cfg.mode,
        apiUrl: cfg.apiUrl,
        model: cfg.model,
        provider: cfg.provider,
      });
    }

    const headers = { 'Content-Type': 'application/json' };
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
      provider: cfg.provider,
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
    provider: current.provider,
    providers: ['openai', 'gemini', 'copilot', 'local'],
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
    provider: resolved.provider,
  });
});

module.exports = router;
