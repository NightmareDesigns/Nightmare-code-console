'use strict';

const express = require('express');
const router = express.Router();

// Built-in language plugins
const LANGUAGE_PLUGINS = [
  // Web
  { id: 'html', name: 'HTML', language: 'html', icon: '🌐', category: 'Web', extensions: ['.html', '.htm'] },
  { id: 'css', name: 'CSS', language: 'css', icon: '🎨', category: 'Web', extensions: ['.css'] },
  { id: 'scss', name: 'SCSS', language: 'scss', icon: '🎨', category: 'Web', extensions: ['.scss', '.sass'] },
  { id: 'less', name: 'Less', language: 'less', icon: '🎨', category: 'Web', extensions: ['.less'] },
  { id: 'javascript', name: 'JavaScript', language: 'javascript', icon: '🟨', category: 'Web', extensions: ['.js', '.mjs', '.cjs'] },
  { id: 'typescript', name: 'TypeScript', language: 'typescript', icon: '🔷', category: 'Web', extensions: ['.ts', '.tsx'] },
  { id: 'jsx', name: 'JSX/React', language: 'javascript', icon: '⚛️', category: 'Web', extensions: ['.jsx'] },
  { id: 'coffeescript', name: 'CoffeeScript', language: 'coffee', icon: '☕', category: 'Web', extensions: ['.coffee'] },
  { id: 'handlebars', name: 'Handlebars', language: 'handlebars', icon: '🖐️', category: 'Web', extensions: ['.hbs', '.handlebars', '.mustache'] },
  { id: 'pug', name: 'Pug/Jade', language: 'pug', icon: '🐾', category: 'Web', extensions: ['.pug', '.jade'] },
  { id: 'twig', name: 'Twig', language: 'twig', icon: '🌿', category: 'Web', extensions: ['.twig'] },
  { id: 'liquid', name: 'Liquid', language: 'liquid', icon: '💧', category: 'Web', extensions: ['.liquid'] },
  { id: 'graphql', name: 'GraphQL', language: 'graphql', icon: '🔗', category: 'Web', extensions: ['.graphql', '.gql'] },
  { id: 'wgsl', name: 'WGSL (WebGPU)', language: 'wgsl', icon: '🖥️', category: 'Web', extensions: ['.wgsl'] },
  { id: 'svelte', name: 'Svelte', language: 'html', icon: '🔥', category: 'Web', extensions: ['.svelte'] },
  { id: 'vue', name: 'Vue', language: 'html', icon: '💚', category: 'Web', extensions: ['.vue'] },
  // Backend
  { id: 'python', name: 'Python', language: 'python', icon: '🐍', category: 'Backend', extensions: ['.py', '.pyw'] },
  { id: 'java', name: 'Java', language: 'java', icon: '☕', category: 'Backend', extensions: ['.java'] },
  { id: 'csharp', name: 'C#', language: 'csharp', icon: '🔵', category: 'Backend', extensions: ['.cs'] },
  { id: 'vb', name: 'VB.NET', language: 'vb', icon: '🔵', category: 'Backend', extensions: ['.vb', '.vbs'] },
  { id: 'fsharp', name: 'F#', language: 'fsharp', icon: '🟣', category: 'Backend', extensions: ['.fs', '.fsx', '.fsi'] },
  { id: 'cpp', name: 'C++', language: 'cpp', icon: '⚙️', category: 'Backend', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hh'] },
  { id: 'c', name: 'C', language: 'c', icon: '⚙️', category: 'Backend', extensions: ['.c', '.h'] },
  { id: 'objective-c', name: 'Objective-C', language: 'objective-c', icon: '🍎', category: 'Backend', extensions: ['.m', '.mm'] },
  { id: 'go', name: 'Go', language: 'go', icon: '🔵', category: 'Backend', extensions: ['.go'] },
  { id: 'rust', name: 'Rust', language: 'rust', icon: '🦀', category: 'Backend', extensions: ['.rs'] },
  { id: 'php', name: 'PHP', language: 'php', icon: '🐘', category: 'Backend', extensions: ['.php', '.phtml'] },
  { id: 'ruby', name: 'Ruby', language: 'ruby', icon: '💎', category: 'Backend', extensions: ['.rb', '.rake', '.gemspec'] },
  { id: 'swift', name: 'Swift', language: 'swift', icon: '🍎', category: 'Backend', extensions: ['.swift'] },
  { id: 'kotlin', name: 'Kotlin', language: 'kotlin', icon: '🟣', category: 'Backend', extensions: ['.kt', '.kts'] },
  { id: 'scala', name: 'Scala', language: 'scala', icon: '🔴', category: 'Backend', extensions: ['.scala', '.sc'] },
  { id: 'elixir', name: 'Elixir', language: 'elixir', icon: '💜', category: 'Backend', extensions: ['.ex', '.exs'] },
  { id: 'clojure', name: 'Clojure', language: 'clojure', icon: '🟢', category: 'Backend', extensions: ['.clj', '.cljs', '.cljc', '.edn'] },
  { id: 'julia', name: 'Julia', language: 'julia', icon: '🟣', category: 'Backend', extensions: ['.jl'] },
  { id: 'pascal', name: 'Pascal', language: 'pascal', icon: '📘', category: 'Backend', extensions: ['.pas', '.pp', '.dpr'] },
  { id: 'scheme', name: 'Scheme', language: 'scheme', icon: '🔵', category: 'Backend', extensions: ['.scm', '.ss', '.rkt'] },
  { id: 'nim', name: 'Nim', language: 'plaintext', icon: '👑', category: 'Backend', extensions: ['.nim', '.nims'] },
  { id: 'zig', name: 'Zig', language: 'plaintext', icon: '⚡', category: 'Backend', extensions: ['.zig'] },
  { id: 'crystal', name: 'Crystal', language: 'plaintext', icon: '💎', category: 'Backend', extensions: ['.cr'] },
  { id: 'haskell', name: 'Haskell', language: 'plaintext', icon: '𝝺', category: 'Backend', extensions: ['.hs', '.lhs'] },
  { id: 'ocaml', name: 'OCaml', language: 'plaintext', icon: '🐫', category: 'Backend', extensions: ['.ml', '.mli'] },
  { id: 'erlang', name: 'Erlang', language: 'plaintext', icon: '📡', category: 'Backend', extensions: ['.erl', '.hrl'] },
  { id: 'd', name: 'D Language', language: 'plaintext', icon: '🔷', category: 'Backend', extensions: ['.d'] },
  // Scripting
  { id: 'bash', name: 'Bash/Shell', language: 'shell', icon: '🐚', category: 'Scripting', extensions: ['.sh', '.bash', '.zsh'] },
  { id: 'powershell', name: 'PowerShell', language: 'powershell', icon: '🔷', category: 'Scripting', extensions: ['.ps1', '.psm1', '.psd1'] },
  { id: 'bat', name: 'Batch Script', language: 'bat', icon: '🖥️', category: 'Scripting', extensions: ['.bat', '.cmd'] },
  { id: 'lua', name: 'Lua', language: 'lua', icon: '🌙', category: 'Scripting', extensions: ['.lua'] },
  { id: 'perl', name: 'Perl', language: 'perl', icon: '🦪', category: 'Scripting', extensions: ['.pl', '.pm', '.pod'] },
  { id: 'tcl', name: 'Tcl', language: 'tcl', icon: '📜', category: 'Scripting', extensions: ['.tcl', '.tk'] },
  { id: 'groovy', name: 'Groovy', language: 'plaintext', icon: '🎸', category: 'Scripting', extensions: ['.groovy', '.gvy', '.gy', '.gsh'] },
  // Data / Config
  { id: 'json', name: 'JSON', language: 'json', icon: '📋', category: 'Data', extensions: ['.json', '.jsonc', '.json5'] },
  { id: 'yaml', name: 'YAML', language: 'yaml', icon: '📋', category: 'Data', extensions: ['.yml', '.yaml'] },
  { id: 'toml', name: 'TOML', language: 'toml', icon: '📋', category: 'Data', extensions: ['.toml'] },
  { id: 'xml', name: 'XML', language: 'xml', icon: '📋', category: 'Data', extensions: ['.xml', '.xsl', '.xslt', '.xsd', '.svg'] },
  { id: 'ini', name: 'INI / Config', language: 'ini', icon: '⚙️', category: 'Data', extensions: ['.ini', '.cfg', '.conf', '.editorconfig'] },
  { id: 'sql', name: 'SQL', language: 'sql', icon: '🗄️', category: 'Data', extensions: ['.sql'] },
  { id: 'pgsql', name: 'PostgreSQL', language: 'pgsql', icon: '🐘', category: 'Data', extensions: ['.pgsql', '.pql'] },
  { id: 'mysql', name: 'MySQL', language: 'mysql', icon: '🐬', category: 'Data', extensions: ['.mysql'] },
  { id: 'proto', name: 'Protocol Buffers', language: 'proto', icon: '📦', category: 'Data', extensions: ['.proto'] },
  { id: 'markdown', name: 'Markdown', language: 'markdown', icon: '📝', category: 'Data', extensions: ['.md', '.markdown', '.mdx'] },
  { id: 'restructuredtext', name: 'reStructuredText', language: 'restructuredtext', icon: '📄', category: 'Data', extensions: ['.rst'] },
  { id: 'sparql', name: 'SPARQL', language: 'sparql', icon: '🔗', category: 'Data', extensions: ['.sparql', '.rq'] },
  { id: 'redis', name: 'Redis', language: 'redis', icon: '🔴', category: 'Data', extensions: ['.redis'] },
  // DevOps
  { id: 'dockerfile', name: 'Dockerfile', language: 'dockerfile', icon: '🐳', category: 'DevOps', extensions: ['Dockerfile', '.dockerfile'] },
  { id: 'hcl', name: 'HCL/Terraform', language: 'hcl', icon: '🏗️', category: 'DevOps', extensions: ['.tf', '.hcl', '.tfvars'] },
  { id: 'bicep', name: 'Bicep (Azure)', language: 'bicep', icon: '☁️', category: 'DevOps', extensions: ['.bicep'] },
  { id: 'azcli', name: 'Azure CLI', language: 'azcli', icon: '☁️', category: 'DevOps', extensions: ['.azcli'] },
  // Web Templates / CMS
  { id: 'razor', name: 'Razor (ASP.NET)', language: 'razor', icon: '💙', category: 'Web Templates', extensions: ['.cshtml', '.razor'] },
  { id: 'apex', name: 'Apex (Salesforce)', language: 'apex', icon: '☁️', category: 'Web Templates', extensions: ['.cls', '.apex', '.trigger'] },
  { id: 'cypher', name: 'Cypher (Neo4j)', language: 'cypher', icon: '🕸️', category: 'Data', extensions: ['.cypher', '.cql'] },
  // Data Science
  { id: 'r', name: 'R', language: 'r', icon: '📊', category: 'Data Science', extensions: ['.r', '.R', '.Rmd'] },
  { id: 'matlab', name: 'MATLAB', language: 'plaintext', icon: '📊', category: 'Data Science', extensions: ['.mat'] },
  // Mobile
  { id: 'dart', name: 'Dart', language: 'dart', icon: '🎯', category: 'Mobile', extensions: ['.dart'] },
  // Blockchain / Smart Contracts
  { id: 'solidity', name: 'Solidity', language: 'solidity', icon: '⬡', category: 'Blockchain', extensions: ['.sol'] },
  // Hardware / Systems
  { id: 'systemverilog', name: 'SystemVerilog', language: 'systemverilog', icon: '🔌', category: 'Hardware', extensions: ['.sv', '.svh', '.v', '.vh'] },
  { id: 'assembly', name: 'Assembly (MIPS)', language: 'mips', icon: '⚙️', category: 'Hardware', extensions: ['.asm', '.s', '.S'] },
  { id: 'vhdl', name: 'VHDL', language: 'plaintext', icon: '🔌', category: 'Hardware', extensions: ['.vhd', '.vhdl'] },
  { id: 'fortran', name: 'Fortran', language: 'plaintext', icon: '🔢', category: 'Hardware', extensions: ['.f90', '.f95', '.f03', '.f08', '.f', '.for', '.ftn'] },
  { id: 'cobol', name: 'COBOL', language: 'plaintext', icon: '🏛️', category: 'Hardware', extensions: ['.cbl', '.cob', '.cobol', '.cpy'] },
  { id: 'ada', name: 'Ada', language: 'plaintext', icon: '🏛️', category: 'Hardware', extensions: ['.ads', '.adb'] },
  // Other
  { id: 'plaintext', name: 'Plain Text', language: 'plaintext', icon: '📄', category: 'Other', extensions: ['.txt', '.text', '.log'] },
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
