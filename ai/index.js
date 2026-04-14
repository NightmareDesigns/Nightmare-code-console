'use strict';

const express = require('express');
const router = express.Router();

const AI_API_URL = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';
const AI_MOCK_MODE = process.env.AI_MOCK_MODE === 'true' || !AI_API_KEY || AI_API_KEY === 'your_api_key_here';

// Detect whether we are pointing at a local AI server (Ollama, LM Studio, etc.)
const isLocalEndpoint = /localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0/.test(AI_API_URL);

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

  if (AI_MOCK_MODE) {
    // Simulate delay
    await new Promise((r) => setTimeout(r, 600));
    const reply = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
    mockIndex++;
    return res.json({
      role: 'assistant',
      content: reply,
      mock: true,
    });
  }

  try {
    const fetch = require('node-fetch');
    const headers = { 'Content-Type': 'application/json' };
    // Only send Authorization header when a key is present
    // (Ollama and LM Studio don't require one)
    if (AI_API_KEY) {
      headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    }
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: AI_MODEL,
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
    });
  } catch (err) {
    console.error('AI fetch error:', err.message);
    // Give a more helpful error when a local server is configured but unreachable
    if (isLocalEndpoint && (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) {
      return res.status(503).json({
        error: `Local AI server not reachable at ${AI_API_URL}. ` +
          'Make sure your local AI server (Ollama, LM Studio, or llama.cpp) is running. ' +
          'For Ollama: ollama serve && ollama pull codellama:7b',
      });
    }
    res.status(500).json({ error: 'Failed to reach AI service' });
  }
});

// Return current AI config (without the API key)
router.get('/config', (req, res) => {
  res.json({
    model: AI_MODEL,
    mockMode: AI_MOCK_MODE,
    apiConfigured: !AI_MOCK_MODE,
    isLocalEndpoint,
    apiUrl: AI_MOCK_MODE ? null : AI_API_URL,
  });
});

module.exports = router;
