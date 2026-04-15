/* ============================================================
   Plugin Manager — Language detection & switcher
   ============================================================ */
'use strict';

(function PluginsModule() {
  let plugins = [];
  let activeLanguage = 'plaintext';

  // Load plugins from backend
  async function loadPlugins() {
    try {
      const resp = await fetch('/api/plugins');
      const data = await resp.json();
      plugins = data.plugins || [];
      renderPluginList();
    } catch {
      // Fallback: minimal list
      plugins = [
        { id: 'javascript', name: 'JavaScript', language: 'javascript', icon: '🟨', category: 'Web' },
        { id: 'python', name: 'Python', language: 'python', icon: '🐍', category: 'Backend' },
        { id: 'plaintext', name: 'Plain Text', language: 'plaintext', icon: '📄', category: 'Other' },
      ];
      renderPluginList();
    }
  }

  function renderPluginList(filter = '') {
    const list = document.getElementById('pluginsList');
    if (!list) return;

    list.innerHTML = '';

    const filterLow = filter.toLowerCase();
    const filtered = filter
      ? plugins.filter((p) => p.name.toLowerCase().includes(filterLow) || p.language.toLowerCase().includes(filterLow))
      : plugins;

    // Group by category
    const categories = {};
    filtered.forEach((p) => {
      if (!categories[p.category]) categories[p.category] = [];
      categories[p.category].push(p);
    });

    Object.entries(categories).forEach(([cat, items]) => {
      const catEl = document.createElement('div');
      catEl.className = 'plugin-category';
      catEl.textContent = cat;
      list.appendChild(catEl);

      items.forEach((p) => {
        const item = document.createElement('div');
        item.className = 'plugin-item' + (p.language === activeLanguage ? ' active' : '');
        item.setAttribute('role', 'listitem');
        item.innerHTML = `
          <span class="plug-icon">${p.icon || '📄'}</span>
          <span class="plug-name">${escHtml(p.name)}</span>
        `;
        item.title = p.extensions ? p.extensions.join(', ') : p.language;
        item.addEventListener('click', () => selectLanguage(p.language));
        list.appendChild(item);
      });
    });
  }

  function selectLanguage(lang) {
    activeLanguage = lang;
    if (window.NightmareEditor) {
      window.NightmareEditor.setLanguage(lang);
    }
    renderPluginList(document.getElementById('pluginSearch')?.value || '');
    setStatus(`Language set to: ${lang}`);
  }

  // Auto-detect language from filename
  async function detectLanguage(filename) {
    try {
      const resp = await fetch(`/api/plugins/detect?filename=${encodeURIComponent(filename)}`);
      const data = await resp.json();
      return data.language || 'plaintext';
    } catch {
      return 'plaintext';
    }
  }

  function setStatus(msg) {
    const el = document.getElementById('statusMsg');
    if (el) {
      el.textContent = msg;
      el.classList.add('updated');
      setTimeout(() => el.classList.remove('updated'), 500);
    }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Search filter
  const pluginSearch = document.getElementById('pluginSearch');
  if (pluginSearch) {
    pluginSearch.addEventListener('input', (e) => {
      renderPluginList(e.target.value);
    });
  }

  loadPlugins();

  window.PluginManager = { selectLanguage, detectLanguage, plugins: () => plugins };
})();
