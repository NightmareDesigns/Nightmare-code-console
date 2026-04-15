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
  const aiProviderSelect = document.getElementById('aiProviderSelect');
  const aiApiUrlInput  = document.getElementById('aiApiUrlInput');
  const aiApiModelInput = document.getElementById('aiApiModelInput');
  const applyAiSettingsBtn = document.getElementById('applyAiSettingsBtn');
  const localAiToggle  = document.getElementById('localAiToggle');
  const localAiSettings = document.getElementById('localAiSettings');
  const localAiUrlInput = document.getElementById('localAiUrlInput');
  const localAiModelInput = document.getElementById('localAiModelInput');
  const saveLocalAiBtn = document.getElementById('saveLocalAiBtn');
  const addonNameInput = document.getElementById('addonNameInput');
  const addonLinkInput = document.getElementById('addonLinkInput');
  const addonRepoInput = document.getElementById('addonRepoInput');
  const addAddonBtn = document.getElementById('addAddonBtn');
  const addonList = document.getElementById('addonList');
  const clearTermBtn   = document.getElementById('clearTermBtn');
  const searchBtn      = document.getElementById('searchBtn');
  const replaceBtn     = document.getElementById('replaceBtn');
  const openFolderBtn  = document.getElementById('openFolderBtn');
  const refreshExplorerBtn = document.getElementById('refreshExplorerBtn');
  const providerHint   = document.getElementById('aiProviderHint');

  const defaultOpenAiUrl = 'https://api.openai.com/v1/chat/completions';
  const defaultOpenAiModel = 'gpt-4o';
  const defaultGeminiModel = 'gemini-1.5-flash';
  const defaultGeminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${defaultGeminiModel}:generateContent`;
  const defaultCopilotUrl = 'https://api.githubcopilot.com/chat/completions';
  const defaultCopilotModel = 'gpt-4o';

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

  function setAiBadge(label, live, title = '') {
    const badge = document.getElementById('aiBadge');
    if (!badge) return;
    badge.textContent = label;
    badge.classList.toggle('live', live);
    if (title) badge.title = title;
  }

  function applyProviderPreset(provider, overwriteDefaults = false) {
    if (!aiApiUrlInput || !aiApiModelInput) return;
    const currentUrl = aiApiUrlInput.value.trim();
    const currentModel = aiApiModelInput.value.trim();
    const hasUrl = currentUrl.length > 0;
    const hasModel = currentModel.length > 0;
    const shouldReplaceUrl = (fallbacks) => {
      if (!hasUrl) return true;
      if (!overwriteDefaults) return false;
      return fallbacks.includes(currentUrl);
    };

    if (provider === 'gemini') {
      if (!hasModel) aiApiModelInput.value = defaultGeminiModel;
      const model = (aiApiModelInput.value || defaultGeminiModel).trim();
      if (shouldReplaceUrl([defaultOpenAiUrl, defaultGeminiUrl])) {
        aiApiUrlInput.value = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      }
      aiApiUrlInput.placeholder = defaultGeminiUrl;
      if (providerHint) providerHint.textContent = 'Gemini uses your Google AI Studio key; URL auto-fills for the model.';
      if (aiApiKeyInput) aiApiKeyInput.placeholder = 'Gemini API key';
      return;
    }

    if (provider === 'copilot') {
      if (!hasModel) aiApiModelInput.value = defaultCopilotModel;
      if (shouldReplaceUrl([defaultOpenAiUrl, defaultGeminiUrl, defaultCopilotUrl])) {
        aiApiUrlInput.value = defaultCopilotUrl;
      }
      aiApiUrlInput.placeholder = defaultCopilotUrl;
      if (providerHint) providerHint.textContent = 'Copilot needs the GitHub Copilot chat endpoint and an account token.';
      if (aiApiKeyInput) aiApiKeyInput.placeholder = 'Copilot token';
      return;
    }

    if (provider === 'local') {
      if (providerHint) providerHint.textContent = 'Local mode prefers Ollama/LM Studio; set URL/model below.';
      if (aiApiKeyInput) aiApiKeyInput.placeholder = 'API key (optional for local)';
      aiApiUrlInput.placeholder = defaultOpenAiUrl;
      if (!hasUrl && overwriteDefaults) aiApiUrlInput.value = '';
      return;
    }

    // OpenAI / compatible default
    if (!hasModel) aiApiModelInput.value = defaultOpenAiModel;
    if (shouldReplaceUrl([defaultGeminiUrl, defaultCopilotUrl, defaultOpenAiUrl])) {
      aiApiUrlInput.value = defaultOpenAiUrl;
    }
    aiApiUrlInput.placeholder = defaultOpenAiUrl;
    if (providerHint) providerHint.textContent = 'OpenAI-compatible endpoints work here (Groq, Together, etc.).';
    if (aiApiKeyInput) aiApiKeyInput.placeholder = 'sk-...';
  }

  async function applyAiSettings(showStatus = true) {
    const key = aiApiKeyInput ? aiApiKeyInput.value.trim() : '';
    const apiUrl = aiApiUrlInput ? aiApiUrlInput.value.trim() : '';
    const apiModel = aiApiModelInput ? aiApiModelInput.value.trim() : '';
    const provider = aiProviderSelect ? aiProviderSelect.value : 'openai';
    const useLocal = provider === 'local' ? true : (localAiToggle ? localAiToggle.checked : false);
    const localUrl = localAiUrlInput ? localAiUrlInput.value.trim() : '';
    const localModel = localAiModelInput ? localAiModelInput.value.trim() : '';

    if (key) localStorage.setItem('nm-api-key', key);
    else localStorage.removeItem('nm-api-key');

    if (apiUrl) localStorage.setItem('nm-api-url', apiUrl);
    else localStorage.removeItem('nm-api-url');

    if (apiModel) localStorage.setItem('nm-api-model', apiModel);
    else localStorage.removeItem('nm-api-model');

    localStorage.setItem('nm-ai-provider', provider || 'openai');
    localStorage.setItem('nm-local-ai', useLocal ? 'true' : 'false');
    if (localUrl) localStorage.setItem('nm-local-ai-url', localUrl);
    if (localModel) localStorage.setItem('nm-local-ai-model', localModel);

    try {
      const resp = await fetch('/api/ai/config/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientConfig: {
            apiKey: key || undefined,
            apiUrl: apiUrl || undefined,
            model: apiModel || undefined,
            useLocal,
            localUrl: localUrl || undefined,
            localModel: localModel || undefined,
            provider,
          },
        }),
      });
      const data = await resp.json();
      const label = data.mode || (data.mockMode ? 'MOCK' : data.isLocalEndpoint ? 'LOCAL' : 'LIVE');
      setAiBadge(label, !data.mockMode, data.apiUrl || '');
      if (showStatus) {
        const detail = data.apiUrl ? `(${data.apiUrl})` : '';
        setStatus(`AI settings applied — ${label} ${detail}`);
      }
    } catch (err) {
      if (showStatus) setStatus(`AI settings saved locally (unable to resolve: ${err.message})`);
    }
  }

  async function loadAiSettingsFromStorage() {
    if (aiApiKeyInput) {
      const saved = localStorage.getItem('nm-api-key');
      if (saved) aiApiKeyInput.value = saved;
    }
    if (aiApiUrlInput) {
      const saved = localStorage.getItem('nm-api-url');
      if (saved) aiApiUrlInput.value = saved;
    }
    if (aiApiModelInput) {
      const saved = localStorage.getItem('nm-api-model');
      if (saved) aiApiModelInput.value = saved;
    }
    if (aiProviderSelect) {
      const saved = localStorage.getItem('nm-ai-provider') || 'openai';
      aiProviderSelect.value = saved;
    }

    try {
      const resp = await fetch('/api/ai/config');
      const cfg = await resp.json();
      if (aiApiUrlInput && !aiApiUrlInput.value) aiApiUrlInput.value = cfg.apiUrl || '';
      if (aiApiModelInput && !aiApiModelInput.value) aiApiModelInput.value = cfg.model || '';
      if (aiProviderSelect && !aiProviderSelect.value) aiProviderSelect.value = cfg.provider || 'openai';
      const label = cfg.apiConfigured
        ? (cfg.isLocalEndpoint ? 'LOCAL' : (cfg.model || 'LIVE'))
        : 'MOCK';
      setAiBadge(label, cfg.apiConfigured, cfg.apiUrl || '');
      applyProviderPreset(aiProviderSelect ? aiProviderSelect.value : 'openai', false);
    } catch {
      // ignore
    }
    const providerValue = aiProviderSelect ? (aiProviderSelect.value || 'openai') : 'openai';
    applyProviderPreset(providerValue, false);
  }

  // API key + AI endpoint (stored in localStorage for convenience)
  loadAiSettingsFromStorage();

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      applyAiSettings();
    });
  }

  if (aiProviderSelect) {
    aiProviderSelect.addEventListener('change', () => {
      applyProviderPreset(aiProviderSelect.value, true);
      if (aiProviderSelect.value === 'local' && localAiToggle) {
        localAiToggle.checked = true;
        if (localAiSettings) localAiSettings.style.display = 'block';
      }
      applyAiSettings();
    });
  }

  if (applyAiSettingsBtn) {
    applyAiSettingsBtn.addEventListener('click', () => applyAiSettings());
  }

  if (aiApiModelInput) {
    aiApiModelInput.addEventListener('change', () => {
      if (!aiProviderSelect || !aiApiUrlInput) return;
      if (aiProviderSelect.value === 'gemini') {
        const nextModel = aiApiModelInput.value.trim() || defaultGeminiModel;
        const currentUrl = aiApiUrlInput.value.trim();
        const isGeminiUrl = currentUrl.startsWith('https://generativelanguage.googleapis.com/v1beta/models/');
        if (!currentUrl || isGeminiUrl || currentUrl === defaultGeminiUrl) {
          aiApiUrlInput.value = `https://generativelanguage.googleapis.com/v1beta/models/${nextModel}:generateContent`;
        }
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
    if (aiProviderSelect && enabled) aiProviderSelect.value = 'local';
    applyProviderPreset(aiProviderSelect ? aiProviderSelect.value : 'openai', false);
  }

  if (localAiToggle) {
    localAiToggle.addEventListener('change', () => {
      const enabled = localAiToggle.checked;
      localStorage.setItem('nm-local-ai', enabled ? 'true' : 'false');
      if (localAiSettings) localAiSettings.style.display = enabled ? 'block' : 'none';
      if (aiProviderSelect && enabled) aiProviderSelect.value = 'local';
      if (aiProviderSelect && !enabled && aiProviderSelect.value === 'local') aiProviderSelect.value = 'openai';
      applyProviderPreset(aiProviderSelect ? aiProviderSelect.value : 'openai', true);
      applyAiSettings(false);
    });
  }

  if (saveLocalAiBtn) {
    saveLocalAiBtn.addEventListener('click', () => {
      const url = localAiUrlInput ? localAiUrlInput.value.trim() : '';
      const model = localAiModelInput ? localAiModelInput.value.trim() : '';
      if (url) localStorage.setItem('nm-local-ai-url', url);
      if (model) localStorage.setItem('nm-local-ai-model', model);
      applyAiSettings();
    });
  }

  loadLocalAiSettings();
  applyAiSettings(false);

  // ── VS Code add-on modules tracker ────────────────────────
  const defaultAddonModules = [
    { id: 'google.gemini-code-assist', name: 'Gemini Code Assist', link: 'https://marketplace.visualstudio.com/items?itemName=google.gemini-code-assist', repo: 'https://cloud.google.com/gemini/docs/code-assist' },
    { id: 'ms-python.python', name: 'Python', link: 'https://marketplace.visualstudio.com/items?itemName=ms-python.python', repo: 'https://github.com/microsoft/vscode-python' },
    { id: 'esbenp.prettier-vscode', name: 'Prettier', link: 'https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode', repo: 'https://github.com/prettier/prettier-vscode' },
    { id: 'dbaeumer.vscode-eslint', name: 'ESLint', link: 'https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint', repo: 'https://github.com/microsoft/vscode-eslint' },
    { id: 'ms-vscode.cpptools', name: 'C/C++', link: 'https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools', repo: 'https://github.com/microsoft/vscode-cpptools' },
    { id: 'eamodio.gitlens', name: 'GitLens', link: 'https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens', repo: 'https://github.com/gitkraken/vscode-gitlens' },
    { id: 'github.copilot', name: 'GitHub Copilot', link: 'https://marketplace.visualstudio.com/items?itemName=GitHub.copilot', repo: 'https://github.com/github/feedback/discussions/categories/copilot' },
    { id: 'streetsidesoftware.code-spell-checker', name: 'Code Spell Checker', link: 'https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker', repo: 'https://github.com/streetsidesoftware/vscode-spell-checker' },
    { id: 'gruntfuggly.todo-tree', name: 'TODO Tree', link: 'https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree', repo: 'https://github.com/Gruntfuggly/todo-tree' },
    { id: 'ms-azuretools.vscode-docker', name: 'Docker', link: 'https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker', repo: 'https://github.com/microsoft/vscode-docker' },
  ];

  function loadAddonModules() {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem('nm-addon-modules') || '[]');
    } catch {
      stored = [];
    }
    if (!stored || stored.length === 0) {
      stored = defaultAddonModules;
    }
    renderAddonModules(stored);
  }

  function saveAddonModules(list) {
    localStorage.setItem('nm-addon-modules', JSON.stringify(list));
  }

  function renderAddonModules(list) {
    if (!addonList) return;
    addonList.innerHTML = '';
    list.forEach((addon, idx) => {
      const item = document.createElement('div');
      item.className = 'addon-item';
      item.innerHTML = `
        <div class="addon-main">
          <div class="addon-name">${escHtml(addon.name || addon.id)}</div>
          <div class="addon-id">${escHtml(addon.id)}</div>
          <div class="addon-links">
            ${addon.link ? `<a class="addon-link" href="${escHtml(addon.link)}" target="_blank" rel="noopener noreferrer">Marketplace</a>` : ''}
            ${addon.repo ? `<a class="addon-link" href="${escHtml(addon.repo)}" target="_blank" rel="noopener noreferrer">Repo</a>` : ''}
          </div>
        </div>
        <div class="addon-actions">
          <button class="btn-pill" data-action="copy" data-idx="${idx}">Copy install</button>
          <button class="btn-pill danger" data-action="remove" data-idx="${idx}">Remove</button>
        </div>
      `;
      addonList.appendChild(item);
    });

    addonList.querySelectorAll('button[data-action="copy"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const addon = list[idx];
        if (!addon) return;
        const cmd = `code --install-extension ${addon.id}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cmd).then(() => setStatus(`Copied install command for ${addon.id}`));
        } else {
          setStatus(cmd);
        }
      });
    });

    addonList.querySelectorAll('button[data-action="remove"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const next = list.filter((_, i) => i !== idx);
        saveAddonModules(next);
        renderAddonModules(next);
        setStatus('Removed add-on module');
      });
    });
  }

  if (addAddonBtn) {
    addAddonBtn.addEventListener('click', () => {
      const id = addonNameInput ? addonNameInput.value.trim() : '';
      const link = addonLinkInput ? addonLinkInput.value.trim() : '';
      const repo = addonRepoInput ? addonRepoInput.value.trim() : '';
      if (!id) {
        setStatus('Add-on ID is required (e.g., ms-python.python)');
        return;
      }
      let current = [];
      try {
        current = JSON.parse(localStorage.getItem('nm-addon-modules') || '[]');
      } catch {
        current = [];
      }
      const name = id.includes('.') ? id.split('.').pop() : id;
      const newEntry = { id, name, link, repo };
      current = [...current.filter((a) => a.id !== id), newEntry];
      saveAddonModules(current);
      renderAddonModules(current);
      setStatus(`Saved VS Code add-on: ${id}`);
      if (addonNameInput) addonNameInput.value = '';
      if (addonLinkInput) addonLinkInput.value = '';
      if (addonRepoInput) addonRepoInput.value = '';
    });
  }

  loadAddonModules();

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
