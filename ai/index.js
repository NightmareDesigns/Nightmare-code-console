'use strict';

const express = require('express');
const router = express.Router();

const DEFAULT_AI_API_URL = 'https://api.openai.com/v1/chat/completions';
const envMockFlag = process.env.AI_MOCK_MODE === 'true';
const preferLocal = process.env.AI_PREFER_LOCAL === 'true';
const localUrl = process.env.AI_LOCAL_URL || 'http://127.0.0.1:11434/v1/chat/completions';
const localModel = process.env.AI_LOCAL_MODEL || 'qwen2.5-coder:3b';
const localApiKey = process.env.AI_LOCAL_API_KEY || '';
const geminiApiKey = process.env.AI_GEMINI_API_KEY || '';
const geminiModel = process.env.AI_GEMINI_MODEL || 'gemini-3.1-flash';
const copilotUrl = process.env.AI_COPILOT_URL || 'https://api.githubcopilot.com/chat/completions';
const copilotKey = process.env.AI_COPILOT_KEY || '';
const copilotModel = process.env.AI_COPILOT_MODEL || 'gpt-4o';
const tabbyUrl = process.env.AI_TABBY_URL || 'http://127.0.0.1:8080/v1/chat/completions';
const tabbyKey = process.env.AI_TABBY_KEY || '';
const tabbyModel = process.env.AI_TABBY_MODEL || 'TabbyML/StarCoder2-15B';
const envProvider = (process.env.AI_PROVIDER || '').toLowerCase();
const defaultProviderFromEnv = envProvider || (preferLocal ? 'local' : (geminiApiKey ? 'gemini' : ''));
const fallbackProvider = defaultProviderFromEnv || ((process.env.AI_API_URL || process.env.AI_API_KEY) ? 'openai' : 'builtin');
const DEFAULT_PROVIDER = (fallbackProvider || 'builtin').toLowerCase();
const buildGeminiUrl = (modelName) => `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
const DEFAULT_GEMINI_URL = buildGeminiUrl(geminiModel);
const BUILTIN_MODEL = 'nightmare-mini';

const providerDefaults = {
  gemini: { url: DEFAULT_GEMINI_URL, key: geminiApiKey, model: geminiModel },
  copilot: { url: copilotUrl, key: copilotKey, model: copilotModel },
  tabby: { url: tabbyUrl, key: tabbyKey, model: tabbyModel },
  builtin: { url: 'builtin://nightmare', key: '', model: BUILTIN_MODEL },
  local: { url: localUrl, key: localApiKey, model: localModel },
  openai: { url: DEFAULT_AI_API_URL, key: '', model: 'gpt-3.5-turbo' },
};
const baseDefaults = providerDefaults[DEFAULT_PROVIDER] || providerDefaults.openai;

let aiApiUrl = DEFAULT_PROVIDER === 'builtin'
  ? baseDefaults.url
  : (process.env.AI_API_URL || baseDefaults.url);
let aiApiKey = DEFAULT_PROVIDER === 'builtin'
  ? ''
  : (process.env.AI_API_KEY || baseDefaults.key);
let aiModel = process.env.AI_MODEL || baseDefaults.model;
let aiMockMode = envMockFlag || (!aiApiKey && DEFAULT_PROVIDER !== 'builtin');

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

  if (provider === 'builtin' || provider === 'mini') {
    return {
      apiUrl: 'builtin://nightmare',
      apiKey: '',
      model: BUILTIN_MODEL,
      mockMode: false,
      mode: 'BUILT-IN',
      isLocalEndpoint: true,
      usedLocal: true,
      hasKey: true,
      provider: 'builtin',
    };
  }

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
  } else if (provider === 'tabby') {
    model = providedModel || tabbyModel;
    apiKey = providedKey || tabbyKey;
    apiUrl = providedUrl || tabbyUrl;
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
understand code across all programming languages. You are knowledgeable, precise, and embrace a gothic aesthetic.
Always format code with proper markdown code blocks using the appropriate language identifier.
Provide clear explanations with actionable advice. When debugging, identify root causes and suggest fixes.
When writing code, follow best practices and include inline comments for complex logic.`;

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

function chooseLanguage(context, promptText) {
  if (context && context.language) return context.language.toLowerCase();
  if (/python/i.test(promptText)) return 'python';
  if (/bash|shell/i.test(promptText)) return 'bash';
  if (/typescript|ts/i.test(promptText)) return 'typescript';
  if (/java\b/i.test(promptText)) return 'java';
  if (/rust/i.test(promptText)) return 'rust';
  if (/go\b/i.test(promptText)) return 'go';
  return 'javascript';
}

function buildIntelligentSnippet(lang, promptText = '', contextCode = '', mode = 'generate') {
  const comment = (text) => {
    if (lang === 'python' || lang === 'shell' || lang === 'bash') return `# ${text}`;
    if (lang === 'rust') return `// ${text}`;
    if (lang === 'go') return `// ${text}`;
    return `// ${text}`;
  };

  const intent = promptText.slice(0, 60).replace(/\n/g, ' ');

  // Analyze context code to provide smarter snippets
  const hasImport = /import |require\(|from .* import/i.test(contextCode);
  const hasClass = /class\s+\w+/i.test(contextCode);
  const hasAsync = /async|await|Promise/i.test(contextCode);
  const hasExport = /export |module\.exports/i.test(contextCode);

  if (mode === 'debug') {
    // Generate debugging helpers
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return [
          comment(`Debug helper for: ${intent}`),
          'function debugLog(label, value) {',
          '  console.log(`[DEBUG] ${label}:`, JSON.stringify(value, null, 2));',
          '  return value; // Allow chaining',
          '}',
          '',
          comment('Add try-catch for error handling'),
          'try {',
          '  const result = yourFunction(input);',
          '  debugLog("Result", result);',
          '} catch (error) {',
          '  console.error("Error:", error.message);',
          '  console.error("Stack:", error.stack);',
          '}',
        ].join('\n');
      case 'python':
        return [
          comment(`Debug helper for: ${intent}`),
          'import traceback',
          'import json',
          '',
          'def debug_log(label, value):',
          '    print(f"[DEBUG] {label}:", json.dumps(value, indent=2, default=str))',
          '    return value',
          '',
          'try:',
          '    result = your_function(input_data)',
          '    debug_log("Result", result)',
          'except Exception as e:',
          '    print(f"Error: {e}")',
          '    traceback.print_exc()',
        ].join('\n');
      default:
        return buildBuiltinSnippet(lang, promptText);
    }
  } else if (mode === 'refactor') {
    // Generate refactored code examples
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return [
          comment(`Refactored version - ${intent}`),
          comment('Before: Large function with multiple responsibilities'),
          comment('After: Split into smaller, focused functions'),
          '',
          'function validateInput(data) {',
          '  if (!data || typeof data !== "object") {',
          '    throw new Error("Invalid input: expected object");',
          '  }',
          '  return true;',
          '}',
          '',
          'function processData(data) {',
          '  return data',
          '    .filter(item => item.active)',
          '    .map(item => ({',
          '      id: item.id,',
          '      name: item.name.trim(),',
          '      timestamp: Date.now()',
          '    }));',
          '}',
          '',
          comment('Main function - clean and readable'),
          'function handleRequest(rawData) {',
          '  validateInput(rawData);',
          '  const processed = processData(rawData.items);',
          '  return { success: true, data: processed };',
          '}',
        ].join('\n');
      case 'python':
        return [
          comment(`Refactored version - ${intent}`),
          'from typing import List, Dict, Any',
          '',
          'def validate_input(data: Dict[str, Any]) -> bool:',
          '    """Validate input data structure."""',
          '    if not isinstance(data, dict):',
          '        raise ValueError("Invalid input: expected dictionary")',
          '    return True',
          '',
          'def process_items(items: List[Dict]) -> List[Dict]:',
          '    """Process and transform items."""',
          '    return [',
          '        {',
          '            "id": item["id"],',
          '            "name": item["name"].strip(),',
          '            "active": item.get("active", False)',
          '        }',
          '        for item in items',
          '        if item.get("active")',
          '    ]',
          '',
          'def handle_request(raw_data: Dict[str, Any]) -> Dict[str, Any]:',
          '    """Main request handler - clean and focused."""',
          '    validate_input(raw_data)',
          '    processed = process_items(raw_data.get("items", []))',
          '    return {"success": True, "data": processed}',
        ].join('\n');
      default:
        return buildBuiltinSnippet(lang, promptText);
    }
  }

  // Default: intelligent code generation
  switch (lang) {
    case 'javascript':
    case 'typescript':
      const useAsync = /api|fetch|http|request|async|await/i.test(promptText);
      const useArray = /array|list|filter|map|sort/i.test(promptText);

      if (useAsync) {
        return [
          comment(`Async function for: ${intent}`),
          'async function fetchData(url, options = {}) {',
          '  try {',
          '    const response = await fetch(url, {',
          '      method: options.method || "GET",',
          '      headers: {',
          '        "Content-Type": "application/json",',
          '        ...options.headers',
          '      },',
          '      ...options',
          '    });',
          '',
          '    if (!response.ok) {',
          '      throw new Error(`HTTP ${response.status}: ${response.statusText}`);',
          '    }',
          '',
          '    const data = await response.json();',
          '    return { success: true, data };',
          '  } catch (error) {',
          '    console.error("Fetch error:", error);',
          '    return { success: false, error: error.message };',
          '  }',
          '}',
          '',
          comment('Usage'),
          'const result = await fetchData("https://api.example.com/data");',
          'if (result.success) console.log(result.data);',
        ].join('\n');
      } else if (useArray) {
        return [
          comment(`Array processing for: ${intent}`),
          'function processArray(items) {',
          '  if (!Array.isArray(items)) return [];',
          '',
          '  return items',
          '    .filter(item => item != null && item.active)',
          '    .map(item => ({',
          '      id: item.id,',
          '      name: item.name?.trim() || "Unknown",',
          '      score: Number(item.score) || 0',
          '    }))',
          '    .sort((a, b) => b.score - a.score);',
          '}',
          '',
          'const data = [',
          '  { id: 1, name: "Item A", score: 95, active: true },',
          '  { id: 2, name: "Item B", score: 87, active: true }',
          '];',
          'console.log(processArray(data));',
        ].join('\n');
      }
      return buildBuiltinSnippet(lang, promptText);

    case 'python':
      const usePyAsync = /async|await|aio|asyncio/i.test(promptText);
      const usePyData = /data|pandas|process|transform/i.test(promptText);

      if (usePyAsync) {
        return [
          comment(`Async function for: ${intent}`),
          'import asyncio',
          'import aiohttp',
          '',
          'async def fetch_data(url: str, session: aiohttp.ClientSession):',
          '    """Fetch data asynchronously."""',
          '    try:',
          '        async with session.get(url) as response:',
          '            response.raise_for_status()',
          '            data = await response.json()',
          '            return {"success": True, "data": data}',
          '    except Exception as e:',
          '        return {"success": False, "error": str(e)}',
          '',
          'async def main():',
          '    async with aiohttp.ClientSession() as session:',
          '        result = await fetch_data("https://api.example.com", session)',
          '        if result["success"]:',
          '            print(result["data"])',
          '',
          'if __name__ == "__main__":',
          '    asyncio.run(main())',
        ].join('\n');
      } else if (usePyData) {
        return [
          comment(`Data processing for: ${intent}`),
          'from typing import List, Dict, Any',
          '',
          'def process_data(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:',
          '    """Process and transform data items."""',
          '    if not items:',
          '        return []',
          '',
          '    result = []',
          '    for item in items:',
          '        if not item.get("active", False):',
          '            continue',
          '',
          '        processed = {',
          '            "id": item.get("id"),',
          '            "name": item.get("name", "").strip(),',
          '            "score": float(item.get("score", 0))',
          '        }',
          '        result.append(processed)',
          '',
          '    return sorted(result, key=lambda x: x["score"], reverse=True)',
          '',
          'data = [',
          '    {"id": 1, "name": "Item A", "score": 95, "active": True},',
          '    {"id": 2, "name": "Item B", "score": 87, "active": True}',
          ']',
          'print(process_data(data))',
        ].join('\n');
      }
      return buildBuiltinSnippet(lang, promptText);

    default:
      return buildBuiltinSnippet(lang, promptText);
  }
}

function buildBuiltinSnippet(lang, promptText = '') {
  const comment = (text) => {
    if (lang === 'python' || lang === 'shell' || lang === 'bash') return `# ${text}`;
    if (lang === 'rust') return `// ${text}`;
    if (lang === 'go') return `// ${text}`;
    return `// ${text}`;
  };
  const intent = promptText ? promptText.slice(0, 80) : 'custom helper';
  switch (lang) {
    case 'python':
      return [
        `${comment(`Nightmare MiniCoder — ${intent}`)}`,
        'from typing import List',
        '',
        'def solve(input_data: str) -> str:',
        "    lines = [line.strip() for line in input_data.split('\\n') if line.strip()]",
        "    summary = f\"{len(lines)} lines parsed\"",
        '    return summary',
        '',
        "if __name__ == '__main__':",
        "    print(solve('example input'))",
      ].join('\n');
    case 'typescript':
      return [
        `${comment(`Nightmare MiniCoder — ${intent}`)}`,
        'type Task = { title: string; done: boolean };',
        '',
        'export function toggleTask(tasks: Task[], title: string): Task[] {',
        '  return tasks.map((t) => t.title === title ? { ...t, done: !t.done } : t);',
        '}',
        '',
        'console.log(toggleTask([{ title: "example", done: false }], "example"));',
      ].join('\n');
    case 'go':
      return [
        `${comment(`Nightmare MiniCoder — ${intent}`)}`,
        'package main',
        '',
        'import "fmt"',
        '',
        'func filter[T comparable](items []T, needle T) []T {',
        '    out := make([]T, 0, len(items))',
        '    for _, v := range items {',
        '        if v != needle {',
        '            out = append(out, v)',
        '        }',
        '    }',
        '    return out',
        '}',
        '',
        'func main() {',
        '    fmt.Println(filter([]string{"a", "b", "a"}, "a"))',
        '}',
      ].join('\n');
    case 'rust':
      return [
        `${comment(`Nightmare MiniCoder — ${intent}`)}`,
        'fn sum_even(nums: &[i64]) -> i64 {',
        '    nums.iter().filter(|n| *n % 2 == 0).sum()',
        '}',
        '',
        'fn main() {',
        '    println!("{}", sum_even(&[1, 2, 3, 4, 5, 6]));',
        '}',
      ].join('\n');
    case 'bash':
    case 'shell':
      return [
        `${comment(`Nightmare MiniCoder — ${intent}`)}`,
        'set -euo pipefail',
        'input=${1:-"./"}',
        'find "$input" -maxdepth 2 -type f -name "*.js" -print',
      ].join('\n');
    case 'java':
      return [
        `${comment(`Nightmare MiniCoder — ${intent}`)}`,
        'public class NightmareMini {',
        '  public static int countWords(String text) {',
        '    String[] parts = text.trim().split("\\\\s+");',
        '    return text.isBlank() ? 0 : parts.length;',
        '  }',
        '  public static void main(String[] args) {',
        '    System.out.println(countWords("Nightmare code console ready"));',
        '  }',
        '}',
      ].join('\n');
    default:
      return [
        `${comment(`Nightmare MiniCoder — ${intent}`)}`,
        'function summarizeLines(text) {',
        "  const lines = (text || '').split(/\\n/).filter(Boolean);",
        '  return { lines: lines.length, preview: lines.slice(0, 3) };',
        '}',
        '',
        "console.log(summarizeLines('hello\\nworld\\nnightmare'));",
      ].join('\n');
  }
}

function buildBuiltinReply(messages, context, cfg) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const promptText = lastUser ? lastUser.content || '' : '';
  const lang = chooseLanguage(context, promptText);

  // Analyze the prompt to understand the request type
  const isDebugging = /debug|error|fix|bug|wrong|issue|problem|crash|fail/i.test(promptText);
  const isExplaining = /what|how|why|explain|describe|understand|means|does/i.test(promptText);
  const isRefactoring = /refactor|improve|optimize|clean|better|rewrite/i.test(promptText);
  const isReviewing = /review|check|look at|feedback|critique/i.test(promptText);
  const isGenerating = !isDebugging && !isExplaining && !isRefactoring && !isReviewing;

  const ctxCode = context && context.code ? context.code : '';
  const ctxFileName = context && context.filename ? context.filename : 'untitled';
  const ctxLang = context && context.language ? context.language : 'plaintext';
  const hasContext = ctxCode.length > 0;

  let response = [];
  response.push(`🩸 **Nightmare MiniCoder** (Built-in Offline AI)`);
  response.push(`Model: ${cfg.model} · Mode: ${cfg.mode}`);

  if (hasContext) {
    response.push(`\nAnalyzing: \`${ctxFileName}\` (${ctxLang}, ${ctxCode.split('\n').length} lines)`);
  }

  // Generate intelligent response based on request type
  if (isDebugging && hasContext) {
    response.push('\n### 🔍 Debug Analysis\n');
    response.push('**Common issues to check:**');
    response.push('1. Variable scope and hoisting issues');
    response.push('2. Async/await or Promise handling');
    response.push('3. Null/undefined checks and type errors');
    response.push('4. Off-by-one errors in loops');
    response.push('5. Incorrect API usage or missing imports');

    const snippet = buildIntelligentSnippet(lang, promptText, ctxCode, 'debug');
    response.push('\n**Suggested fix:**');
    response.push('```' + lang);
    response.push(snippet);
    response.push('```');
  } else if (isExplaining && hasContext) {
    response.push('\n### 📚 Code Explanation\n');
    response.push('**What this code does:**');
    const lines = ctxCode.split('\n').slice(0, 10);
    const hasFunc = /function|const.*=>|def |class /i.test(ctxCode);
    const hasLoop = /for|while|forEach|map|filter/i.test(ctxCode);
    const hasAsync = /async|await|Promise|then\(/i.test(ctxCode);

    if (hasFunc) response.push('- Defines functions/methods to encapsulate logic');
    if (hasLoop) response.push('- Uses iteration to process collections or repeat operations');
    if (hasAsync) response.push('- Handles asynchronous operations (API calls, file I/O, etc.)');
    response.push('- Implements business logic for your application');

    response.push('\n**Key concepts:**');
    response.push(`- Language: ${ctxLang.toUpperCase()}`);
    response.push(`- Paradigm: ${hasFunc ? 'Functional/OOP' : 'Procedural'}`);
    response.push(`- Complexity: ${ctxCode.split('\n').length > 50 ? 'Medium-High' : 'Low-Medium'}`);
  } else if (isRefactoring && hasContext) {
    response.push('\n### ⚡ Refactoring Suggestions\n');
    response.push('**Improvements to consider:**');
    response.push('1. **Extract functions** - Break down large functions into smaller, reusable units');
    response.push('2. **Remove duplication** - Use loops, functions, or abstractions for repeated code');
    response.push('3. **Improve naming** - Use descriptive names that reveal intent');
    response.push('4. **Add error handling** - Guard against edge cases and invalid input');
    response.push('5. **Optimize performance** - Cache results, reduce complexity, minimize allocations');

    const snippet = buildIntelligentSnippet(lang, promptText, ctxCode, 'refactor');
    response.push('\n**Refactored example:**');
    response.push('```' + lang);
    response.push(snippet);
    response.push('```');
  } else if (isReviewing && hasContext) {
    response.push('\n### 👁️ Code Review\n');
    response.push('**Checklist:**');
    response.push('- ✓ Code follows language conventions and style guides');
    response.push('- ✓ Functions are small, focused, and well-named');
    response.push('- ✓ Error handling is present for failure cases');
    response.push('- ✓ No obvious security vulnerabilities');
    response.push('- ✓ Performance considerations are appropriate');

    response.push('\n**Recommendations:**');
    response.push('- Add inline comments for complex algorithms');
    response.push('- Include unit tests for critical functions');
    response.push('- Consider edge cases and validate inputs');
    response.push('- Document public APIs and interfaces');
  } else {
    // Code generation
    response.push(`\n### 💡 Code Generation\n`);
    response.push('**Request:** ' + promptText.slice(0, 120) + (promptText.length > 120 ? '...' : ''));

    const snippet = buildIntelligentSnippet(lang, promptText, ctxCode, 'generate');
    response.push('\n**Generated solution:**');
    response.push('```' + lang);
    response.push(snippet);
    response.push('```');

    response.push('\n**Implementation notes:**');
    response.push('- Follow the pattern above and adapt to your specific needs');
    response.push('- Test edge cases thoroughly');
    response.push('- Add error handling for production use');
    response.push('- Consider performance for large datasets');
  }

  if (!hasContext && isGenerating) {
    response.push('\n💡 **Tip:** Enable "Include editor context" to get more specific help!');
  }

  response.push('\n---');
  response.push('*For advanced AI capabilities, configure a cloud provider (OpenAI, Gemini) or local model (Ollama) in Settings → AI*');

  return response.join('\n');
}

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
    if (cfg.provider === 'builtin') {
      const reply = buildBuiltinReply(messages, context, cfg);
      return res.json({
        role: 'assistant',
        content: reply,
        mock: false,
        mode: cfg.mode,
        apiUrl: cfg.apiUrl,
        model: cfg.model,
        provider: cfg.provider,
      });
    }

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
          'For Ollama: ollama serve && ollama pull qwen2.5-coder:3b',
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
    providers: ['openai', 'gemini', 'copilot', 'tabby', 'local', 'builtin'],
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
