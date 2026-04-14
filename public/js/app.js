/* ============================================================
   Nightmare Code Console — App Controller
   Orchestrates all modules: editor, AI, plugins, file system,
   settings, terminal, keyboard shortcuts
   ============================================================ */
'use strict';

(function AppModule() {
  // ── State ──────────────────────────────────────────────────
  let sidebarVisible = true;
  let aiPanelVisible = true;
  let terminalVisible = true;
  let currentSidebarPanel = 'explorer';
  let wsClient = null;
  let term = null; // xterm terminal instance

  // ── DOM refs ───────────────────────────────────────────────
  const sidebar        = document.getElementById('sidebar');
  const aiPanel        = document.getElementById('aiPanel');
  const sidebarToggle  = document.getElementById('sidebarToggle');
  const aiToggleBtn    = document.getElementById('aiToggleBtn');
  const terminalPanel  = document.getElementById('terminalPanel');
  const termToggleBtn  = document.getElementById('termToggleBtn');
  const runBtn         = document.getElementById('runBtn');
  const newTabBtn      = document.getElementById('newTabBtn');
  const newFileBtn     = document.getElementById('newFileBtn');
  const runModal       = document.getElementById('runModal');
  const closeRunModal  = document.getElementById('closeRunModal');
  const runOutput      = document.getElementById('runOutput');
  const fontSizeRange  = document.getElementById('fontSizeRange');
  const fontSizeValue  = document.getElementById('fontSizeValue');
  const tabSizeSelect  = document.getElementById('tabSizeSelect');
  const wordWrapSelect = document.getElementById('wordWrapSelect');
  const minimapToggle  = document.getElementById('minimapToggle');
  const matrixToggle   = document.getElementById('matrixToggle');
  const bloodToggle    = document.getElementById('bloodToggle');
  const matrixSpeedRange = document.getElementById('matrixSpeedRange');
  const aiApiKeyInput  = document.getElementById('aiApiKeyInput');
  const saveApiKeyBtn  = document.getElementById('saveApiKeyBtn');
  const localAiToggle  = document.getElementById('localAiToggle');
  const localAiSettings = document.getElementById('localAiSettings');
  const localAiUrlInput = document.getElementById('localAiUrlInput');
  const localAiModelInput = document.getElementById('localAiModelInput');
  const saveLocalAiBtn = document.getElementById('saveLocalAiBtn');
  const clearTermBtn   = document.getElementById('clearTermBtn');
  const searchBtn      = document.getElementById('searchBtn');
  const replaceBtn     = document.getElementById('replaceBtn');
  const openFolderBtn  = document.getElementById('openFolderBtn');
  const refreshExplorerBtn = document.getElementById('refreshExplorerBtn');

  // ── Sidebar panel switcher ─────────────────────────────────
  function activateSidebarPanel(panelId) {
    document.querySelectorAll('.sidebar-panel').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.activity-btn').forEach((el) => el.classList.remove('active'));

    const panel = document.getElementById(`panel-${panelId}`);
    if (panel) panel.classList.add('active');

    const btn = document.querySelector(`.activity-btn[data-panel="${panelId}"]`);
    if (btn) btn.classList.add('active');

    currentSidebarPanel = panelId;

    // Auto-open sidebar if collapsed
    if (!sidebarVisible) toggleSidebar();
  }

  document.querySelectorAll('.activity-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      if (currentSidebarPanel === panel && sidebarVisible) {
        toggleSidebar(); // collapse if same panel clicked
      } else {
        activateSidebarPanel(panel);
        if (!sidebarVisible) toggleSidebar();
      }
    });
  });

  // ── Toggle sidebar ─────────────────────────────────────────
  function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
    if (sidebar) sidebar.classList.toggle('collapsed', !sidebarVisible);
    setTimeout(() => window.NightmareEditor && window.NightmareEditor.relayout(), 200);
  }

  if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);

  // ── Toggle AI panel ────────────────────────────────────────
  function toggleAiPanel() {
    aiPanelVisible = !aiPanelVisible;
    if (aiPanel) aiPanel.classList.toggle('collapsed', !aiPanelVisible);
    if (aiToggleBtn) aiToggleBtn.classList.toggle('active', aiPanelVisible);
    setTimeout(() => window.NightmareEditor && window.NightmareEditor.relayout(), 200);
  }

  if (aiToggleBtn) aiToggleBtn.addEventListener('click', toggleAiPanel);

  // ── Toggle terminal ────────────────────────────────────────
  function toggleTerminal() {
    terminalVisible = !terminalVisible;
    if (terminalPanel) terminalPanel.classList.toggle('collapsed', !terminalVisible);
    setTimeout(() => {
      if (window.NightmareEditor) window.NightmareEditor.relayout();
      if (term && window.fitAddon) window.fitAddon.fit();
    }, 200);
  }

  if (termToggleBtn) termToggleBtn.addEventListener('click', toggleTerminal);

  // ── Terminal tabs ──────────────────────────────────────────
  document.querySelectorAll('.term-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const termName = tab.dataset.term;
      document.querySelectorAll('.term-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.term-pane').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById(`term-${termName}`);
      if (pane) pane.classList.add('active');
    });
  });

  // ── Clear terminal ─────────────────────────────────────────
  if (clearTermBtn) {
    clearTermBtn.addEventListener('click', () => {
      if (term) term.clear();
      const consoleOut = document.getElementById('consoleOutput');
      if (consoleOut) consoleOut.innerHTML = '';
    });
  }

  // ── xterm terminal init ────────────────────────────────────
  function initTerminal() {
    const container = document.getElementById('xtermContainer');
    if (!container || typeof Terminal === 'undefined') return;

    term = new Terminal({
      theme: {
        background: '#0a0a0f',
        foreground: '#e0e0f0',
        cursor: '#cc0000',
        cursorAccent: '#0a0a0f',
        selection: '#8b000040',
        black: '#0a0a0f',
        red: '#cc0000',
        green: '#00ff41',
        yellow: '#ffd080',
        blue: '#0080ff',
        magenta: '#c080ff',
        cyan: '#60d0ff',
        white: '#e0e0f0',
        brightBlack: '#50506a',
        brightRed: '#ff4444',
        brightGreen: '#44ff80',
        brightYellow: '#ffd080',
        brightBlue: '#44aaff',
        brightMagenta: '#ff80ff',
        brightCyan: '#80e8ff',
        brightWhite: '#ffffff',
      },
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      convertEol: true,
      scrollback: 1000,
    });

    const fitAddon = new FitAddon.FitAddon();
    window.fitAddon = fitAddon;
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    term.writeln('\x1b[1;31m🩸 Nightmare Code Console Terminal\x1b[0m');
    term.writeln('\x1b[2mConnected — type commands below\x1b[0m');
    term.writeln('');
    term.write('\x1b[32m$ \x1b[0m');

    let inputBuffer = '';
    term.onKey(({ key, domEvent }) => {
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
      if (domEvent.keyCode === 13) { // Enter
        term.writeln('');
        if (inputBuffer.trim()) {
          handleTerminalCommand(inputBuffer.trim());
        }
        inputBuffer = '';
        term.write('\x1b[32m$ \x1b[0m');
      } else if (domEvent.keyCode === 8) { // Backspace
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else if (printable) {
        inputBuffer += key;
        term.write(key);
      }
    });

    window.addEventListener('resize', () => {
      if (fitAddon && terminalVisible) fitAddon.fit();
    });

    window.NightmareTerminal = term;
  }

  function handleTerminalCommand(cmd) {
    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        term.writeln('\x1b[33mAvailable commands:\x1b[0m');
        term.writeln('  help       — show this help');
        term.writeln('  clear      — clear terminal');
        term.writeln('  echo <msg> — echo a message');
        term.writeln('  ls         — list virtual files');
        term.writeln('  version    — show version');
        term.writeln('  ai <msg>   — quick AI query');
        break;
      case 'clear':
        term.clear();
        break;
      case 'echo':
        term.writeln(args.join(' '));
        break;
      case 'version':
        term.writeln('\x1b[32mNightmare Code Console v1.0.0\x1b[0m');
        break;
      case 'ls':
        term.writeln('\x1b[34muntitled\x1b[0m  (virtual file)');
        break;
      case 'ai':
        if (args.length > 0 && window.NightmareAI) {
          const aiInput = document.getElementById('aiInput');
          if (aiInput) {
            aiInput.value = args.join(' ');
            window.NightmareAI.send();
            term.writeln('\x1b[2mQuery sent to NightmareAI...\x1b[0m');
          }
        } else {
          term.writeln('\x1b[31mUsage: ai <your question>\x1b[0m');
        }
        break;
      default:
        term.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`);
        term.writeln('Type \x1b[33mhelp\x1b[0m for available commands.');
    }
  }

  // ── Run Code (simulated) ───────────────────────────────────
  if (runBtn) {
    runBtn.addEventListener('click', runCode);
  }

  function runCode() {
    if (!window.NightmareEditor) return;
    const code = window.NightmareEditor.getCurrentContent();
    const lang = window.NightmareEditor.getCurrentLanguage();

    let output = `[Nightmare Runner] Language: ${lang}\n`;
    output += `[Nightmare Runner] File: ${window.NightmareEditor.getCurrentFilename()}\n`;
    output += `[Nightmare Runner] Lines: ${code.split('\n').length}\n\n`;

    if (lang === 'javascript') {
      try {
        const logs = [];
        const fakeConsole = {
          log: (...a) => logs.push(a.map(String).join(' ')),
          error: (...a) => logs.push('ERROR: ' + a.map(String).join(' ')),
          warn: (...a) => logs.push('WARN: ' + a.map(String).join(' ')),
        };
        // eslint-disable-next-line no-new-func
        const fn = new Function('console', code);
        fn(fakeConsole);
        output += logs.length > 0 ? logs.join('\n') : '(no output)';
      } catch (e) {
        output += `Runtime Error:\n  ${e.message}`;
      }
    } else {
      output += `[Note] Direct execution is supported for JavaScript in the browser.\n`;
      output += `For ${lang}, connect a server-side runner or use the integrated terminal.\n`;
      output += `\nCode preview (first 10 lines):\n`;
      output += code.split('\n').slice(0, 10).map((l, i) => `${String(i + 1).padStart(3)} | ${l}`).join('\n');
      if (code.split('\n').length > 10) output += '\n... (truncated)';
    }

    // Show in run modal
    if (runOutput) runOutput.textContent = output;
    if (runModal) runModal.removeAttribute('hidden');

    // Also write to terminal
    if (term) {
      term.writeln('\x1b[33m▶ Running...\x1b[0m');
      output.split('\n').forEach((line) => term.writeln(line));
      term.write('\x1b[32m$ \x1b[0m');
    }

    // Log to console panel
    logToConsole(output, 'log');
  }

  if (closeRunModal) closeRunModal.addEventListener('click', () => { if (runModal) runModal.setAttribute('hidden', ''); });
  if (runModal) runModal.addEventListener('click', (e) => { if (e.target === runModal) runModal.setAttribute('hidden', ''); });

  // ── Console logging ────────────────────────────────────────
  function logToConsole(msg, level = 'log') {
    const out = document.getElementById('consoleOutput');
    if (!out) return;
    const line = document.createElement('div');
    line.className = `console-line ${level}`;
    line.textContent = msg;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  // ── Settings ───────────────────────────────────────────────
  if (fontSizeRange) {
    fontSizeRange.addEventListener('input', () => {
      const val = parseInt(fontSizeRange.value, 10);
      if (fontSizeValue) fontSizeValue.textContent = `${val}px`;
      if (window.NightmareEditor) window.NightmareEditor.updateOption('fontSize', val);
    });
  }

  if (tabSizeSelect) {
    tabSizeSelect.addEventListener('change', () => {
      const val = parseInt(tabSizeSelect.value, 10);
      if (window.NightmareEditor) window.NightmareEditor.updateOption('tabSize', val);
    });
  }

  if (wordWrapSelect) {
    wordWrapSelect.addEventListener('change', () => {
      if (window.NightmareEditor) window.NightmareEditor.updateOption('wordWrap', wordWrapSelect.value);
    });
  }

  if (minimapToggle) {
    minimapToggle.addEventListener('change', () => {
      if (window.NightmareEditor) window.NightmareEditor.updateOption('minimap', { enabled: minimapToggle.checked });
    });
  }

  if (matrixToggle) {
    matrixToggle.addEventListener('change', () => {
      if (window.MatrixRain) window.MatrixRain.setEnabled(matrixToggle.checked);
    });
  }

  if (bloodToggle) {
    bloodToggle.addEventListener('change', () => {
      if (window.BloodDrip) window.BloodDrip.setEnabled(bloodToggle.checked);
    });
  }

  if (matrixSpeedRange) {
    matrixSpeedRange.addEventListener('input', () => {
      if (window.MatrixRain) window.MatrixRain.setSpeed(matrixSpeedRange.value);
    });
  }

  // API Key (stored in localStorage for convenience - not sent to server in this implementation)
  if (aiApiKeyInput) {
    const saved = localStorage.getItem('nm-api-key');
    if (saved) aiApiKeyInput.value = saved;
  }
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      const key = aiApiKeyInput ? aiApiKeyInput.value.trim() : '';
      if (key) {
        localStorage.setItem('nm-api-key', key);
        setStatus('API key saved locally (reload to apply server-side)');
      }
    });
  }

  // ── Local AI settings ──────────────────────────────────────
  function loadLocalAiSettings() {
    const enabled = localStorage.getItem('nm-local-ai') === 'true';
    const url = localStorage.getItem('nm-local-ai-url') || 'http://localhost:11434/v1/chat/completions';
    const model = localStorage.getItem('nm-local-ai-model') || 'codellama:7b';

    if (localAiToggle) localAiToggle.checked = enabled;
    if (localAiUrlInput) localAiUrlInput.value = url;
    if (localAiModelInput) localAiModelInput.value = model;
    if (localAiSettings) localAiSettings.style.display = enabled ? 'block' : 'none';
  }

  if (localAiToggle) {
    localAiToggle.addEventListener('change', () => {
      const enabled = localAiToggle.checked;
      localStorage.setItem('nm-local-ai', enabled ? 'true' : 'false');
      if (localAiSettings) localAiSettings.style.display = enabled ? 'block' : 'none';
    });
  }

  if (saveLocalAiBtn) {
    saveLocalAiBtn.addEventListener('click', () => {
      const url = localAiUrlInput ? localAiUrlInput.value.trim() : '';
      const model = localAiModelInput ? localAiModelInput.value.trim() : '';
      if (url) localStorage.setItem('nm-local-ai-url', url);
      if (model) localStorage.setItem('nm-local-ai-model', model);
      setStatus('Local AI settings saved — restart the server with updated .env to apply');
    });
  }

  loadLocalAiSettings();

  // ── New Tab / File ─────────────────────────────────────────
  if (newTabBtn) {
    newTabBtn.addEventListener('click', () => {
      if (window.NightmareEditor) window.NightmareEditor.newTab();
    });
  }

  if (newFileBtn) {
    newFileBtn.addEventListener('click', () => {
      const name = prompt('New file name:', 'untitled.js');
      if (!name) return;
      window.NightmareEditor && window.NightmareEditor.newTab();
      // Detect language
      if (window.PluginManager) {
        window.PluginManager.detectLanguage(name).then((lang) => {
          const tab = window.NightmareEditor.getTab(window.NightmareEditor.activeTabId);
          if (tab) {
            tab.name = name;
            window.NightmareEditor.setLanguage(lang);
          }
        });
      }
    });
  }

  // ── File Explorer ──────────────────────────────────────────
  if (openFolderBtn) {
    openFolderBtn.addEventListener('click', () => {
      loadFileTree('/');
    });
  }

  if (refreshExplorerBtn) {
    refreshExplorerBtn.addEventListener('click', () => {
      loadFileTree();
    });
  }

  async function loadFileTree(path) {
    const tree = document.getElementById('fileTree');
    if (!tree) return;
    try {
      const url = path ? `/api/files?path=${encodeURIComponent(path)}` : '/api/files';
      const resp = await fetch(url);
      const data = await resp.json();
      renderFileTree(data.items || [], tree, data.path);
    } catch (err) {
      if (tree) tree.innerHTML = `<div class="file-tree-item" style="color:#ff6b6b">Could not load files</div>`;
    }
  }

  function renderFileTree(items, container, basePath) {
    container.innerHTML = '';
    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'file-tree-item' + (item.type === 'directory' ? ' file-tree-folder' : '');
      el.dataset.path = item.path;
      el.innerHTML = `
        <span class="item-icon">${item.type === 'directory' ? '📁' : getFileIcon(item.name)}</span>
        <span class="item-name">${escHtml(item.name)}</span>
      `;
      el.title = item.path;
      el.addEventListener('click', () => {
        if (item.type === 'directory') {
          loadFileTree(item.path);
        } else {
          openFileFromTree(item.path, item.name);
        }
      });
      container.appendChild(el);
    });
  }

  async function openFileFromTree(path, name) {
    try {
      const resp = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      const data = await resp.json();
      let lang = 'plaintext';
      if (window.PluginManager) {
        lang = await window.PluginManager.detectLanguage(name);
      }
      if (window.NightmareEditor) {
        window.NightmareEditor.openFile(path, name, data.content || '', lang);
      }
      // Highlight active item in tree using data-path attribute
      document.querySelectorAll('.file-tree-item').forEach((el) => el.classList.remove('active'));
      const activeItem = document.querySelector(`.file-tree-item[data-path="${CSS.escape(path)}"]`);
      if (activeItem) activeItem.classList.add('active');
    } catch (err) {
      logToConsole(`Failed to open file: ${err.message}`, 'error');
    }
  }

  // ── Search ─────────────────────────────────────────────────
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = document.getElementById('searchInput')?.value?.trim();
      if (query && window.NightmareEditor) {
        // Use Monaco's built-in find
        const editor = window.NightmareEditor;
        // Trigger find widget
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
      }
    });
  }

  // ── Keyboard Shortcuts ─────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Ctrl+B — toggle sidebar
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    // Ctrl+Shift+A — toggle AI panel
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      toggleAiPanel();
    }
    // Ctrl+` — toggle terminal
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      toggleTerminal();
    }
    // Ctrl+T — new tab
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      if (window.NightmareEditor) window.NightmareEditor.newTab();
    }
    // F5 — run code
    if (e.key === 'F5') {
      e.preventDefault();
      runCode();
    }
    // Escape — close modal
    if (e.key === 'Escape') {
      if (runModal && !runModal.hidden) runModal.setAttribute('hidden', '');
    }
  });

  // ── Settings button ────────────────────────────────────────
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      activateSidebarPanel('settings-panel');
    });
  }

  // ── WebSocket ──────────────────────────────────────────────
  function initWebSocket() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsClient = new WebSocket(`${proto}//${location.host}/ws`);
    wsClient.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'connected') {
          setStatus('Nightmare Code Console — Connected 🩸');
        }
      } catch {}
    });
    wsClient.addEventListener('close', () => {
      setTimeout(initWebSocket, 3000);
    });
    wsClient.addEventListener('error', () => {});
  }

  // ── Status bar ─────────────────────────────────────────────
  function setStatus(msg) {
    const el = document.getElementById('statusMsg');
    if (el) {
      el.textContent = msg;
      el.classList.add('updated');
      setTimeout(() => el.classList.remove('updated'), 500);
    }
  }

  // ── File icon helper ───────────────────────────────────────
  function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
      js: '🟨', ts: '🔷', tsx: '🔷', jsx: '🟨', py: '🐍', html: '🌐',
      css: '🎨', scss: '🎨', json: '📋', yml: '📋', yaml: '📋',
      md: '📝', sh: '🐚', rs: '🦀', go: '🔵', java: '☕',
      cs: '🔵', cpp: '⚙️', c: '⚙️', php: '🐘', rb: '💎',
      swift: '🍎', kt: '🟣', lua: '🌙', sql: '🗄️', dockerfile: '🐳',
    };
    return icons[ext] || '📄';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Init ───────────────────────────────────────────────────
  window.addEventListener('editor-ready', () => {
    setStatus('Nightmare Code Console — Ready 🩸');
    initTerminal();
    initWebSocket();
    loadFileTree();
  });

  // Fallback init if editor-ready never fires
  setTimeout(() => {
    const term = document.getElementById('xtermContainer');
    if (term && !window.NightmareTerminal) {
      initTerminal();
    }
    if (!wsClient) initWebSocket();
    loadFileTree();
  }, 3000);

  window.NightmareApp = { setStatus, logToConsole, loadFileTree, runCode };
})();
