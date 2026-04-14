'use strict';

const express = require('express');
const router = express.Router();

// Built-in language plugins
const LANGUAGE_PLUGINS = [
  // Web
  { id: 'html', name: 'HTML', language: 'html', icon: '🌐', category: 'Web', extensions: ['.html', '.htm'] },
  { id: 'css', name: 'CSS', language: 'css', icon: '🎨', category: 'Web', extensions: ['.css'] },
  { id: 'scss', name: 'SCSS', language: 'scss', icon: '🎨', category: 'Web', extensions: ['.scss', '.sass'] },
  { id: 'javascript', name: 'JavaScript', language: 'javascript', icon: '🟨', category: 'Web', extensions: ['.js', '.mjs', '.cjs'] },
  { id: 'typescript', name: 'TypeScript', language: 'typescript', icon: '🔷', category: 'Web', extensions: ['.ts', '.tsx'] },
  { id: 'jsx', name: 'JSX/React', language: 'javascript', icon: '⚛️', category: 'Web', extensions: ['.jsx'] },
  // Backend
  { id: 'python', name: 'Python', language: 'python', icon: '🐍', category: 'Backend', extensions: ['.py'] },
  { id: 'java', name: 'Java', language: 'java', icon: '☕', category: 'Backend', extensions: ['.java'] },
  { id: 'csharp', name: 'C#', language: 'csharp', icon: '🔵', category: 'Backend', extensions: ['.cs'] },
  { id: 'cpp', name: 'C++', language: 'cpp', icon: '⚙️', category: 'Backend', extensions: ['.cpp', '.cc', '.cxx'] },
  { id: 'c', name: 'C', language: 'c', icon: '⚙️', category: 'Backend', extensions: ['.c'] },
  { id: 'go', name: 'Go', language: 'go', icon: '🔵', category: 'Backend', extensions: ['.go'] },
  { id: 'rust', name: 'Rust', language: 'rust', icon: '🦀', category: 'Backend', extensions: ['.rs'] },
  { id: 'php', name: 'PHP', language: 'php', icon: '🐘', category: 'Backend', extensions: ['.php'] },
  { id: 'ruby', name: 'Ruby', language: 'ruby', icon: '💎', category: 'Backend', extensions: ['.rb'] },
  { id: 'swift', name: 'Swift', language: 'swift', icon: '🍎', category: 'Backend', extensions: ['.swift'] },
  { id: 'kotlin', name: 'Kotlin', language: 'kotlin', icon: '🟣', category: 'Backend', extensions: ['.kt'] },
  // Scripting
  { id: 'bash', name: 'Bash/Shell', language: 'shell', icon: '🐚', category: 'Scripting', extensions: ['.sh', '.bash'] },
  { id: 'powershell', name: 'PowerShell', language: 'powershell', icon: '🔷', category: 'Scripting', extensions: ['.ps1'] },
  { id: 'lua', name: 'Lua', language: 'lua', icon: '🌙', category: 'Scripting', extensions: ['.lua'] },
  { id: 'perl', name: 'Perl', language: 'perl', icon: '🦪', category: 'Scripting', extensions: ['.pl', '.pm'] },
  // Data / Config
  { id: 'json', name: 'JSON', language: 'json', icon: '📋', category: 'Data', extensions: ['.json'] },
  { id: 'yaml', name: 'YAML', language: 'yaml', icon: '📋', category: 'Data', extensions: ['.yml', '.yaml'] },
  { id: 'toml', name: 'TOML', language: 'toml', icon: '📋', category: 'Data', extensions: ['.toml'] },
  { id: 'xml', name: 'XML', language: 'xml', icon: '📋', category: 'Data', extensions: ['.xml'] },
  { id: 'sql', name: 'SQL', language: 'sql', icon: '🗄️', category: 'Data', extensions: ['.sql'] },
  { id: 'markdown', name: 'Markdown', language: 'markdown', icon: '📝', category: 'Data', extensions: ['.md', '.markdown'] },
  // Systems
  { id: 'dockerfile', name: 'Dockerfile', language: 'dockerfile', icon: '🐳', category: 'DevOps', extensions: ['Dockerfile'] },
  { id: 'hcl', name: 'HCL/Terraform', language: 'hcl', icon: '🏗️', category: 'DevOps', extensions: ['.tf', '.hcl'] },
  // Other
  { id: 'r', name: 'R', language: 'r', icon: '📊', category: 'Data Science', extensions: ['.r', '.R'] },
  { id: 'matlab', name: 'MATLAB', language: 'matlab', icon: '📊', category: 'Data Science', extensions: ['.m'] },
  { id: 'scala', name: 'Scala', language: 'scala', icon: '🔴', category: 'Backend', extensions: ['.scala'] },
  { id: 'elixir', name: 'Elixir', language: 'elixir', icon: '💧', category: 'Backend', extensions: ['.ex', '.exs'] },
  { id: 'dart', name: 'Dart', language: 'dart', icon: '🎯', category: 'Mobile', extensions: ['.dart'] },
  { id: 'graphql', name: 'GraphQL', language: 'graphql', icon: '🔗', category: 'Web', extensions: ['.graphql', '.gql'] },
  { id: 'plaintext', name: 'Plain Text', language: 'plaintext', icon: '📄', category: 'Other', extensions: ['.txt'] },
];

// Extension to language map for auto-detection
const EXT_MAP = {};
LANGUAGE_PLUGINS.forEach((p) => {
  p.extensions.forEach((ext) => {
    EXT_MAP[ext.toLowerCase()] = p.language;
  });
});

router.get('/', (req, res) => {
  res.json({ plugins: LANGUAGE_PLUGINS });
});

router.get('/detect', (req, res) => {
  const filename = req.query.filename || '';
  const ext = require('path').extname(filename).toLowerCase() || filename.toLowerCase();
  const language = EXT_MAP[ext] || 'plaintext';
  const plugin = LANGUAGE_PLUGINS.find((p) => p.language === language) || LANGUAGE_PLUGINS[LANGUAGE_PLUGINS.length - 1];
  res.json({ language, plugin });
});

module.exports = router;
