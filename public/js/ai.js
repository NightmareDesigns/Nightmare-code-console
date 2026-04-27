/* ============================================================
   AI Assistant Panel
   ============================================================ */
'use strict';

(function AiModule() {
  const messagesContainer = document.getElementById('aiMessages');
  const input = document.getElementById('aiInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const clearBtn = document.getElementById('clearChatBtn');
  const badge = document.getElementById('aiBadge');
  const statusMsg = document.getElementById('statusMsg');

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

  function setBadge(label, live, title = '') {
    if (!badge) return;
    badge.textContent = label;
    badge.classList.toggle('live', live);
    if (title) badge.title = title;
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
    })
    .catch(() => {});

  // ── Markdown rendering ─────────────────────────────────────
  function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      return marked.parse(text);
    }
    // Built-in fallback renderer
    return fallbackMarkdown(text);
  }

  function fallbackMarkdown(text) {
    // Escape HTML first
    let out = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Fenced code blocks (```lang\n...\n```)
    out = out.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const cls = lang ? ` class="language-${escAttr(lang)}"` : '';
      return `<pre><code${cls}>${code}</code></pre>`;
    });

    // Inline code
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Headings
    out = out.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    out = out.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    out = out.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Unordered list items
    out = out.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

    // Paragraphs (double newline)
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

  function highlightCode(container) {
    if (typeof hljs !== 'undefined') {
      container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
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

    // Add user message
    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    // Show thinking indicator
    const { msg: thinkingMsg, bubble: thinkingBubble } = appendMessage('assistant', '', true);

    // Gather context from editor
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

      // Replace thinking with actual response
      thinkingBubble.innerHTML = renderMarkdown(reply);
      highlightCode(thinkingBubble);

      // Update badge
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

  // ── Event listeners ────────────────────────────────────────
  if (sendBtn) sendBtn.addEventListener('click', send);

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

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Expose ─────────────────────────────────────────────────
  window.NightmareAI = { send, appendMessage };
})();
