/* ============================================================
   AI Assistant Panel
   ============================================================ */
'use strict';

(function AiModule() {
  const MAX_BUILD_OUTPUT_CHARS = 2000;

  const messagesContainer = document.getElementById('aiMessages');
  const input = document.getElementById('aiInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const clearBtn = document.getElementById('clearChatBtn');
  const badge = document.getElementById('aiBadge');
  const statusMsg = document.getElementById('statusMsg');
  const quickActionButtons = Array.from(document.querySelectorAll('[data-ai-prompt]'));

  // Gemini tool buttons
  const geminiToolsBar   = document.getElementById('geminiToolsBar');
  const gtListFilesBtn   = document.getElementById('gtListFilesBtn');
  const gtReadFileBtn    = document.getElementById('gtReadFileBtn');
  const gtCreateFileBtn  = document.getElementById('gtCreateFileBtn');
  const gtBuildBtn       = document.getElementById('gtBuildBtn');
  const gtAnalyzeBtn     = document.getElementById('gtAnalyzeBtn');

  // History kept for context
  const history = [];

  function getClientConfig() {
    const useLocal = localStorage.getItem('nm-local-ai') === 'true';
    const cfg = {
      apiKey: localStorage.getItem('nm-api-key') || undefined,
      apiUrl: localStorage.getItem('nm-api-url') || undefined,
      model: localStorage.getItem('nm-api-model') || undefined,
      provider: localStorage.getItem('nm-ai-provider') || 'builtin',
      useLocal,
      localUrl: useLocal ? (localStorage.getItem('nm-local-ai-url') || undefined) : undefined,
      localModel: useLocal ? (localStorage.getItem('nm-local-ai-model') || undefined) : undefined,
    };
    return cfg;
  }

  function currentProvider() {
    return localStorage.getItem('nm-ai-provider') || 'builtin';
  }

  function setBadge(label, live, title = '') {
    if (!badge) return;
    badge.textContent = label;
    badge.classList.toggle('live', live);
    if (title) badge.title = title;
  }

  // Show / hide Gemini tools bar depending on provider
  function updateGeminiToolsVisibility(provider) {
    if (!geminiToolsBar) return;
    geminiToolsBar.style.display = (provider === 'gemini') ? 'flex' : 'none';
  }

  // Fetch AI config on load
  fetch('/api/ai/config')
    .then((r) => r.json())
    .then((cfg) => {
      if (!badge) return;
      const provider = (cfg.provider || '').toLowerCase();
      if (provider === 'builtin') {
        setBadge('BUILT-IN', true, 'Offline built-in engine — no API key needed');
      } else if (cfg.apiConfigured) {
        const label = cfg.isLocalEndpoint ? 'LOCAL' : (cfg.provider || 'LIVE').toUpperCase();
        setBadge(label, true, cfg.apiUrl || '');
      } else {
        setBadge('OFFLINE', false, 'No API key configured — select a provider in Settings');
      }
      updateGeminiToolsVisibility(provider);
    })
    .catch(() => {});

  // Keep tools bar in sync when provider changes from Settings
  document.addEventListener('nm-provider-changed', (e) => {
    updateGeminiToolsVisibility(e.detail || currentProvider());
  });

  // ── Markdown rendering ─────────────────────────────────────
  function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      return marked.parse(text);
    }
    return fallbackMarkdown(text);
  }

  function fallbackMarkdown(text) {
    let out = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    out = out.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const cls = lang ? ` class="language-${escAttr(lang)}"` : '';
      return `<pre><code${cls}>${code}</code></pre>`;
    });
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
    out = out.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    out = out.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    out = out.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    out = out.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    out = out
      .split(/\n{2,}/)
      .map((block) => {
        if (/^<(pre|ul|h[123])/.test(block.trim())) return block;
        if (!block.trim()) return '';
        return `<p>${block.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');
    return out;
  }

  function escAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightCode(container) {
    if (typeof hljs !== 'undefined') {
      container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }

  // ── Code-block action buttons ──────────────────────────────
  function attachCodeActions(bubble) {
    bubble.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.code-actions')) return; // already attached
      const code = pre.querySelector('code');
      if (!code) return;

      const actions = document.createElement('div');
      actions.className = 'code-actions';

      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-action-btn';
      copyBtn.textContent = '📋 Copy';
      copyBtn.title = 'Copy code to clipboard';
      copyBtn.addEventListener('click', () => {
        const text = code.innerText || code.textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
          });
        }
      });
      actions.appendChild(copyBtn);

      // Apply to Editor button
      const applyBtn = document.createElement('button');
      applyBtn.className = 'code-action-btn';
      applyBtn.textContent = '✏️ Apply to Editor';
      applyBtn.title = 'Replace current editor content with this code';
      applyBtn.addEventListener('click', () => {
        if (window.NightmareEditor) {
          const text = code.innerText || code.textContent;
          window.NightmareEditor.setContent(text);
          if (window.NightmareApp) window.NightmareApp.setStatus('Code applied to editor');
        }
      });
      actions.appendChild(applyBtn);

      // Create File button
      const createBtn = document.createElement('button');
      createBtn.className = 'code-action-btn';
      createBtn.textContent = '📄 Create File';
      createBtn.title = 'Save this code as a new file in the project';
      createBtn.addEventListener('click', async () => {
        const filePath = prompt('Save as file path (e.g. src/utils/helper.js):', 'untitled.js');
        if (!filePath) return;
        const text = code.innerText || code.textContent;
        try {
          const resp = await fetch('/api/ai/tools/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath, content: text }),
          });
          const data = await resp.json();
          if (data.success) {
            if (window.NightmareApp) {
              window.NightmareApp.setStatus(`File created: ${data.path}`);
              window.NightmareApp.loadFileTree && window.NightmareApp.loadFileTree();
            }
            appendToolNotice(`✅ File created: \`${data.path}\``, 'success', data.path);
          } else {
            if (window.NightmareApp) window.NightmareApp.setStatus(`Error: ${data.error}`);
          }
        } catch (err) {
          if (window.NightmareApp) window.NightmareApp.setStatus(`Create file error: ${err.message}`);
        }
      });
      actions.appendChild(createBtn);

      pre.appendChild(actions);
    });
  }

  // ── Tool-action notice banner ──────────────────────────────
  function appendToolNotice(text, kind = 'info', filePath = null) {
    const notice = document.createElement('div');
    notice.className = `ai-tool-notice ${kind}`;
    notice.innerHTML = renderMarkdown(text);

    if (filePath) {
      const openBtn = document.createElement('button');
      openBtn.className = 'code-action-btn';
      openBtn.textContent = '📂 Open in Editor';
      openBtn.style.marginTop = '6px';
      openBtn.addEventListener('click', async () => {
        try {
          const resp = await fetch(`/api/ai/tools/file?path=${encodeURIComponent(filePath)}`);
          const data = await resp.json();
          if (window.NightmareEditor && data.content !== undefined) {
            const name = filePath.split('/').pop();
            let lang = 'plaintext';
            if (window.PluginManager) lang = await window.PluginManager.detectLanguage(name);
            window.NightmareEditor.openFile(filePath, name, data.content, lang);
          }
        } catch (err) {
          if (window.NightmareApp) window.NightmareApp.setStatus(`Open error: ${err.message}`);
        }
      });
      notice.appendChild(openBtn);
    }

    if (messagesContainer) {
      messagesContainer.appendChild(notice);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // ── Handle toolActions from backend ───────────────────────
  function handleToolActions(toolActions) {
    if (!Array.isArray(toolActions)) return;
    for (const action of toolActions) {
      if (action.type === 'file_created') {
        appendToolNotice(`✅ **Gemini created file:** \`${action.path}\``, 'success', action.path);
        // Refresh file tree
        if (window.NightmareApp && window.NightmareApp.loadFileTree) window.NightmareApp.loadFileTree();
      } else if (action.type === 'build_result') {
        const icon = action.success ? '✅' : '⚠️';
        const label = action.success ? 'Build succeeded' : 'Build finished with errors';
        appendToolNotice(`${icon} **${label}**`, action.success ? 'success' : 'warn');
        // Write build output to the terminal / console
        const output = [action.stdout, action.stderr].filter(Boolean).join('\n');
        if (output && window.NightmareApp && window.NightmareApp.logToConsole) {
          window.NightmareApp.logToConsole(`[Gemini Build]\n${output}`, action.success ? 'log' : 'warn');
        }
        if (output && window.NightmareTerminal) {
          window.NightmareTerminal.writeln('\x1b[33m[Gemini Build Output]\x1b[0m');
          output.split('\n').forEach((line) => window.NightmareTerminal.writeln(line));
          window.NightmareTerminal.write('\x1b[32m$ \x1b[0m');
        }
      }
    }
  }

  // ── Message rendering ──────────────────────────────────────
  function appendMessage(role, content, thinking = false) {
    const msg = document.createElement('div');
    msg.className = `ai-message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'ai-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🩸';

    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble';

    if (thinking) {
      bubble.innerHTML = `
        <div class="ai-thinking">
          <div class="ai-thinking-dot"></div>
          <div class="ai-thinking-dot"></div>
          <div class="ai-thinking-dot"></div>
        </div>`;
    } else {
      bubble.innerHTML = renderMarkdown(content);
      highlightCode(bubble);
      if (role === 'assistant') attachCodeActions(bubble);
    }

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return { msg, bubble };
  }

  // ── Send message ───────────────────────────────────────────
  async function send() {
    const text = (input ? input.value : '').trim();
    if (!text) return;

    if (input) input.value = '';
    if (sendBtn) sendBtn.disabled = true;

    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    const { msg: thinkingMsg, bubble: thinkingBubble } = appendMessage('assistant', '', true);

    let context = null;
    const ctxToggle = document.getElementById('aiContextToggle');
    if (ctxToggle && ctxToggle.checked && window.NightmareEditor) {
      const code = window.NightmareEditor.getCurrentContent();
      if (code && code.trim()) {
        context = {
          code,
          language: window.NightmareEditor.getCurrentLanguage(),
          filename: window.NightmareEditor.getCurrentFilename(),
        };
      }
    }

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context, clientConfig: getClientConfig() }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const reply = data.content || '(No response)';
      history.push({ role: 'assistant', content: reply });

      thinkingBubble.innerHTML = renderMarkdown(reply);
      highlightCode(thinkingBubble);
      attachCodeActions(thinkingBubble);

      // Handle any tool actions Gemini performed (file creates, builds)
      if (data.toolActions) handleToolActions(data.toolActions);

      if (badge) {
        const label = data.mode || (data.mock ? 'MOCK' : 'LIVE');
        setBadge(label, !data.mock, data.apiUrl || '');
      }
      if (statusMsg && data.mode) {
        statusMsg.textContent = `NightmareAI — ${data.mode}`;
      }
    } catch (err) {
      thinkingBubble.innerHTML = `<span style="color:#ff6b6b">⚠ Error: ${escHtml(err.message)}</span>`;
    }

    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }

  function triggerQuickAction(promptText) {
    if (!input || !promptText) return;
    input.value = promptText;
    send();
  }

  // ── Gemini tool button actions ─────────────────────────────

  async function geminiListFiles() {
    try {
      const resp = await fetch('/api/ai/tools/files');
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const fileList = (data.items || []).map((i) => `${i.type === 'directory' ? '📁' : '📄'} ${i.path}`).join('\n');
      const msg = `Here are the project files I found:\n\n\`\`\`\n${fileList}\n\`\`\`\n\nTell me about these files, identify the main entry points, and suggest any improvements.`;
      if (input) input.value = msg;
      send();
    } catch (err) {
      if (window.NightmareApp) window.NightmareApp.setStatus(`Files error: ${err.message}`);
    }
  }

  function geminiReadFile() {
    const filePath = prompt('File path to read (e.g. server.js):');
    if (!filePath) return;
    if (input) input.value = `Please read the file \`${filePath}\` and explain what it does, identify any issues, and suggest improvements.`;
    send();
  }

  function geminiCreateFile() {
    const filePath = prompt('New file path to create (e.g. src/utils/helper.js):');
    if (!filePath) return;
    const desc = prompt(`What should the file \`${filePath}\` do?`, 'A utility module with helper functions');
    if (!desc) return;
    if (input) input.value = `Create the file \`${filePath}\`: ${desc}`;
    send();
  }

  async function geminiBuild() {
    const cmd = prompt('npm script to run (build / install / test / lint / dev / start):', 'build');
    if (!cmd) return;

    appendMessage('user', `🔨 Running build: \`npm run ${cmd}\``);
    history.push({ role: 'user', content: `Run build command: npm run ${cmd}` });
    const { bubble: thinkingBubble } = appendMessage('assistant', '', true);

    if (sendBtn) sendBtn.disabled = true;
    try {
      const resp = await fetch('/api/ai/tools/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await resp.json();
      const icon = data.success ? '✅' : '⚠️';
      const label = data.success ? 'Build succeeded!' : 'Build finished with errors';
      const output = [data.stdout, data.stderr].filter(Boolean).join('\n').slice(0, MAX_BUILD_OUTPUT_CHARS);
      const reply = `${icon} **${label}**\n\n\`\`\`\n${output || '(no output)'}\n\`\`\``;

      thinkingBubble.innerHTML = renderMarkdown(reply);
      highlightCode(thinkingBubble);
      history.push({ role: 'assistant', content: reply });

      if (output && window.NightmareTerminal) {
        window.NightmareTerminal.writeln(`\x1b[33m[Build: npm run ${cmd}]\x1b[0m`);
        output.split('\n').forEach((line) => window.NightmareTerminal.writeln(line));
        window.NightmareTerminal.write('\x1b[32m$ \x1b[0m');
      }
      if (output && window.NightmareApp && window.NightmareApp.logToConsole) {
        window.NightmareApp.logToConsole(`[Build: npm run ${cmd}]\n${output}`, data.success ? 'log' : 'warn');
      }
    } catch (err) {
      thinkingBubble.innerHTML = `<span style="color:#ff6b6b">⚠ Build error: ${escHtml(err.message)}</span>`;
    }
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }

  async function geminiAnalyzeProject() {
    if (input) input.value = 'Please analyze this project: first use list_files to see the project structure, then read the key source files to understand the codebase, then give me a comprehensive overview of the architecture, what each part does, and your top suggestions for improvement.';
    send();
  }

  // ── Gemini tool button event listeners ────────────────────
  if (gtListFilesBtn)  gtListFilesBtn.addEventListener('click',  geminiListFiles);
  if (gtReadFileBtn)   gtReadFileBtn.addEventListener('click',   geminiReadFile);
  if (gtCreateFileBtn) gtCreateFileBtn.addEventListener('click', geminiCreateFile);
  if (gtBuildBtn)      gtBuildBtn.addEventListener('click',      geminiBuild);
  if (gtAnalyzeBtn)    gtAnalyzeBtn.addEventListener('click',    geminiAnalyzeProject);

  // ── Event listeners ────────────────────────────────────────
  if (sendBtn) sendBtn.addEventListener('click', send);
  quickActionButtons.forEach((button) => {
    button.addEventListener('click', () => triggerQuickAction(button.dataset.aiPrompt || ''));
  });

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        send();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
        history.length = 0;
        appendMessage('assistant', 'Chat cleared. How can I help you?');
      }
    });
  }

  // ── Expose ─────────────────────────────────────────────────
  window.NightmareAI = { send, appendMessage, updateGeminiToolsVisibility };
})();
