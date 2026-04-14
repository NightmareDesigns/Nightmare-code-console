#!/usr/bin/env node
/**
 * build-android.js
 *
 * Copies the public/ web assets and all vendored frontend dependencies
 * into dist/, which is what Capacitor's webDir points at for Android builds.
 *
 * Usage:  node scripts/build-android.js
 *         npm run build
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const NODE_MODULES = path.join(ROOT, 'node_modules');

// ── Helpers ──────────────────────────────────────────────────
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  [skip] ${src} — not found`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  [skip] ${src} — not found`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// ── Clean dist/ ───────────────────────────────────────────────
console.log('🩸 Nightmare Code Console — Android static build\n');
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// ── 1. Copy public/ web app files ────────────────────────────
console.log('📂 Copying public/ → dist/');
copyDir(PUBLIC, DIST);

// ── 2. Vendor assets from node_modules ───────────────────────
const vendors = [
  {
    src: path.join(NODE_MODULES, 'monaco-editor', 'min'),
    dest: path.join(DIST, 'vendor', 'monaco'),
    label: 'monaco-editor',
  },
  {
    src: path.join(NODE_MODULES, 'marked'),
    dest: path.join(DIST, 'vendor', 'marked'),
    label: 'marked',
  },
  {
    src: path.join(NODE_MODULES, 'highlight.js'),
    dest: path.join(DIST, 'vendor', 'hljs'),
    label: 'highlight.js',
  },
  {
    src: path.join(NODE_MODULES, 'xterm'),
    dest: path.join(DIST, 'vendor', 'xterm'),
    label: 'xterm',
  },
  {
    src: path.join(NODE_MODULES, 'xterm-addon-fit'),
    dest: path.join(DIST, 'vendor', 'xterm-fit'),
    label: 'xterm-addon-fit',
  },
];

for (const v of vendors) {
  console.log(`📦 Copying ${v.label} → dist/vendor/${path.basename(v.dest)}`);
  copyDir(v.src, v.dest);
}

// ── 3. Rewrite asset paths for offline / Capacitor ───────────
// The Capacitor webview loads files via capacitor://localhost/
// All paths in index.html are already root-relative (/vendor/..., /css/..., etc.)
// so no rewriting is needed — Capacitor serves them correctly.
console.log('\n✅ dist/ build complete.');
console.log(`   Output: ${DIST}`);
console.log('\nNext steps:');
console.log('  npx cap sync android   — sync web assets to Android project');
console.log('  npx cap open android   — open in Android Studio');
console.log('  npx cap run android    — build + deploy to device/emulator\n');
