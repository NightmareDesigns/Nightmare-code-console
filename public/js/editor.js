/* ============================================================
   Monaco Editor Manager
   ============================================================ */
'use strict';

(function EditorModule() {
  // Tab state
  const tabs = [
    { id: 0, name: 'untitled', language: 'plaintext', content: '', modified: false, path: null },
  ];
  let activeTabId = 0;
  let editor = null;
  let editorReady = false;
  const onReadyCallbacks = [];

  // ── Wait for Monaco ────────────────────────────────────────
  function waitForMonaco(cb) {
    if (typeof monaco !== 'undefined') {
      cb();
    } else {
      const id = setInterval(() => {
        if (typeof monaco !== 'undefined') {
          clearInterval(id);
          cb();
        }
      }, 100);
    }
  }

  // ── Initialize Monaco ──────────────────────────────────────
  function init() {
    waitForMonaco(() => {
      const container = document.getElementById('monacoEditor');
      if (!container) return;

      editor = monaco.editor.create(container, {
        value: getWelcomeContent(),
        language: 'plaintext',
        theme: 'nightmare-dark',
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 4,
        insertSpaces: true,
        renderWhitespace: 'selection',
        lineNumbers: 'on',
        glyphMargin: true,
        folding: true,
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'phase',
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: true,
        formatOnType: true,
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        suggest: { showStatusBar: true },
        padding: { top: 8, bottom: 8 },
      });

      defineNightmareTheme();
      monaco.editor.setTheme('nightmare-dark');

      // Sync content on change
      editor.onDidChangeModelContent(() => {
        const tab = getTab(activeTabId);
        if (tab) {
          tab.content = editor.getValue();
          tab.modified = true;
          updateTabEl(tab.id);
        }
      });

      // Update cursor position in status bar
      editor.onDidChangeCursorPosition((e) => {
        const pos = e.position;
        const el = document.getElementById('statusPos');
        if (el) el.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
      });

      editorReady = true;
      onReadyCallbacks.forEach((cb) => cb(editor));

      // Notify app that editor is ready
      window.dispatchEvent(new Event('editor-ready'));
    });
  }

  function defineNightmareTheme() {
    monaco.editor.defineTheme('nightmare-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '',              foreground: 'e0e0f0', background: '0a0a0f' },
        { token: 'comment',       foreground: '50506a', fontStyle: 'italic' },
        { token: 'keyword',       foreground: 'cc0000', fontStyle: 'bold' },
        { token: 'string',        foreground: '90d080' },
        { token: 'number',        foreground: 'ffd080' },
        { token: 'regexp',        foreground: 'ff8040' },
        { token: 'type',          foreground: '80c0ff' },
        { token: 'class',         foreground: 'ffaa40' },
        { token: 'function',      foreground: '60d0ff' },
        { token: 'variable',      foreground: 'e0e0f0' },
        { token: 'variable.other', foreground: 'c0c0e0' },
        { token: 'constant',      foreground: 'ffaa40' },
        { token: 'operator',      foreground: 'ff6666' },
        { token: 'delimiter',     foreground: '8080a0' },
        { token: 'tag',           foreground: 'cc4444' },
        { token: 'attribute.name', foreground: 'ffd080' },
        { token: 'attribute.value', foreground: '90d080' },
        { token: 'namespace',     foreground: 'c080ff' },
        { token: 'decorator',     foreground: 'ff80ff' },
      ],
      colors: {
        'editor.background':              '#0a0a0f',
        'editor.foreground':              '#e0e0f0',
        'editor.lineHighlightBackground': '#13131a',
        'editorLineNumber.foreground':    '#3a3a5a',
        'editorLineNumber.activeForeground': '#cc0000',
        'editorCursor.foreground':        '#cc0000',
        'editor.selectionBackground':     '#8b000040',
        'editor.inactiveSelectionBackground': '#8b000020',
        'editor.findMatchBackground':     '#8b000060',
        'editor.findMatchHighlightBackground': '#8b000030',
        'editorGutter.background':        '#0a0a0f',
        'editorBracketMatch.background':  '#8b000030',
        'editorBracketMatch.border':      '#cc0000',
        'editorWidget.background':        '#0e0e14',
        'editorWidget.border':            '#2a2a3a',
        'editorSuggestWidget.background': '#0e0e14',
        'editorSuggestWidget.border':     '#2a2a3a',
        'editorSuggestWidget.selectedBackground': '#1e1e2e',
        'input.background':               '#0a0a0f',
        'input.foreground':               '#e0e0f0',
        'input.border':                   '#2a2a3a',
        'focusBorder':                    '#cc0000',
        'scrollbar.shadow':               '#000000',
        'scrollbarSlider.background':     '#2a2a3a80',
        'scrollbarSlider.hoverBackground': '#3a3a5a80',
        'scrollbarSlider.activeBackground': '#cc000060',
        'minimap.background':             '#0a0a0f',
        'statusBar.background':           '#8b0000',
      },
    });
  }

  function getWelcomeContent() {
    return `// 🩸 Welcome to Nightmare Code Console
// AI-powered code editor with a dark soul
//
// Features:
//   • Monaco Editor (VS Code engine) with Nightmare theme
//   • Matrix rain background animation
//   • Blood drip visual effects
//   • AI assistant (NightmareAI) — ask anything about your code
//   • 35+ language plugins with syntax highlighting
//   • Integrated terminal and file explorer
//
// Getting Started:
//   • Open a file: Ctrl+O or use the Explorer panel
//   • New tab: Ctrl+T or click the + tab button
//   • Toggle AI: Ctrl+Shift+A or click the 🤖 button
//   • Run code: F5 or click ▶ Run
//   • Toggle terminal: Ctrl+\`
//   • Command palette: Ctrl+Shift+P
//
// Configure AI: copy .env.example to .env and add your API key.

console.log("Nightmare Code Console — Initialized 🩸");
`;
  }

  // ── Tab Management ─────────────────────────────────────────
  function getTab(id) {
    return tabs.find((t) => t.id === id);
  }

  function openTab(tab) {
    if (!tabs.find((t) => t.id === tab.id)) {
      tabs.push(tab);
    }
    setActiveTab(tab.id);
  }

  function setActiveTab(id) {
    // Save current tab content
    const current = getTab(activeTabId);
    if (current && editor) {
      current.content = editor.getValue();
    }
    activeTabId = id;
    const tab = getTab(id);
    if (!tab) return;
    renderTabs();
    if (editor) {
      const model = monaco.editor.createModel(tab.content || '', tab.language || 'plaintext');
      editor.setModel(model);
    }
    updateBreadcrumb(tab);
    updateStatusLang(tab.language || 'plaintext');
  }

  function closeTab(id) {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tabs.splice(idx, 1);
    if (tabs.length === 0) {
      // Always keep at least one tab
      const newTab = { id: Date.now(), name: 'untitled', language: 'plaintext', content: '', modified: false, path: null };
      tabs.push(newTab);
    }
    if (activeTabId === id) {
      setActiveTab(tabs[Math.min(idx, tabs.length - 1)].id);
    } else {
      renderTabs();
    }
  }

  function newTab() {
    const tab = {
      id: Date.now(),
      name: 'untitled',
      language: 'plaintext',
      content: '',
      modified: false,
      path: null,
    };
    openTab(tab);
  }

  function openFile(path, name, content, language) {
    // Check if already open
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      setActiveTab(existing.id);
      return;
    }
    const tab = {
      id: Date.now(),
      name: name || path.split('/').pop(),
      language: language || 'plaintext',
      content: content || '',
      modified: false,
      path,
    };
    openTab(tab);
  }

  function getCurrentContent() {
    return editor ? editor.getValue() : '';
  }

  function setContent(text) {
    if (!editor) return;
    editor.setValue(text || '');
    const tab = getTab(activeTabId);
    if (tab) {
      tab.content = text || '';
      tab.modified = true;
      updateTabEl(tab.id);
    }
  }

  function getCurrentLanguage() {
    const tab = getTab(activeTabId);
    return tab ? tab.language : 'plaintext';
  }

  function getCurrentFilename() {
    const tab = getTab(activeTabId);
    return tab ? tab.name : 'untitled';
  }

  function setLanguage(lang) {
    const tab = getTab(activeTabId);
    if (tab) tab.language = lang;
    if (editor) {
      monaco.editor.setModelLanguage(editor.getModel(), lang);
    }
    updateStatusLang(lang);
    updateBreadcrumb(getTab(activeTabId));
  }

  function markSaved(id) {
    const tab = getTab(id != null ? id : activeTabId);
    if (tab) {
      tab.modified = false;
      updateTabEl(tab.id);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  function renderTabs() {
    const bar = document.getElementById('tabBar');
    if (!bar) return;

    // Remove existing tabs (not the new-tab button)
    const newTabBtn = document.getElementById('newTabBtn');
    bar.innerHTML = '';

    tabs.forEach((tab) => {
      const el = document.createElement('button');
      el.className = 'tab' + (tab.id === activeTabId ? ' active' : '') + (tab.modified ? ' modified' : '');
      el.dataset.id = tab.id;
      el.setAttribute('role', 'tab');
      el.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
      el.innerHTML = `
        <span class="tab-icon">${getFileIcon(tab.language)}</span>
        <span class="tab-name">${escHtml(tab.name)}</span>
        <span class="tab-close" title="Close" role="button" aria-label="Close ${escHtml(tab.name)}">✕</span>
      `;
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close')) {
          closeTab(tab.id);
        } else {
          setActiveTab(tab.id);
        }
      });
      bar.appendChild(el);
    });

    if (newTabBtn) {
      bar.appendChild(newTabBtn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'new-tab-btn';
      btn.id = 'newTabBtn';
      btn.title = 'New Tab';
      btn.setAttribute('aria-label', 'New tab');
      btn.textContent = '＋';
      btn.addEventListener('click', newTab);
      bar.appendChild(btn);
    }
  }

  function updateTabEl(id) {
    const tab = getTab(id);
    if (!tab) return;
    const el = document.querySelector(`.tab[data-id="${id}"]`);
    if (el) {
      el.className = 'tab' + (tab.id === activeTabId ? ' active' : '') + (tab.modified ? ' modified' : '');
    }
  }

  function updateBreadcrumb(tab) {
    const fileEl = document.getElementById('breadcrumbFile');
    const langEl = document.getElementById('breadcrumbLang');
    if (fileEl) fileEl.textContent = tab ? tab.name : 'untitled';
    if (langEl) langEl.textContent = tab ? tab.language : 'plaintext';
  }

  function updateStatusLang(lang) {
    const el = document.getElementById('statusLang');
    if (el) el.textContent = lang;
  }

  // ── Editor Options ─────────────────────────────────────────
  function updateOption(key, value) {
    if (editor) editor.updateOptions({ [key]: value });
  }

  // ── Insert text at cursor ──────────────────────────────────
  function insertText(text) {
    if (!editor) return;
    const selection = editor.getSelection();
    editor.executeEdits('ai-insert', [{
      range: selection,
      text,
      forceMoveMarkers: true,
    }]);
    editor.focus();
  }

  // ── Resize on layout change ────────────────────────────────
  function relayout() {
    if (editor) editor.layout();
  }

  window.addEventListener('resize', relayout);

  // ── Utilities ─────────────────────────────────────────────
  function getFileIcon(lang) {
    const icons = {
      javascript: '🟨', typescript: '🔷', python: '🐍', html: '🌐',
      css: '🎨', scss: '🎨', json: '📋', yaml: '📋', markdown: '📝',
      java: '☕', csharp: '🔵', cpp: '⚙️', c: '⚙️', go: '🔵',
      rust: '🦀', php: '🐘', ruby: '💎', swift: '🍎', kotlin: '🟣',
      shell: '🐚', powershell: '🔷', lua: '🌙', sql: '🗄️',
      dockerfile: '🐳', r: '📊', dart: '🎯', graphql: '🔗',
    };
    return icons[lang] || '📄';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Initialize on DOM ready ────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API
  window.NightmareEditor = {
    onReady: (cb) => { if (editorReady) cb(editor); else onReadyCallbacks.push(cb); },
    openFile,
    openTab,
    newTab,
    closeTab,
    setActiveTab,
    getCurrentContent,
    setContent,
    getCurrentLanguage,
    getCurrentFilename,
    setLanguage,
    markSaved,
    insertText,
    relayout,
    updateOption,
    getTab,
    tabs,
    get activeTabId() { return activeTabId; },
  };
})();
