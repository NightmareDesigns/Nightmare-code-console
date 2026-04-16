/**
 * server/main.js
 *
 * Entry point for the capacitor-nodejs plugin on Android.
 * This file is bundled into the Android APK and started by the
 * NodeJS-Mobile runtime in a background thread.
 *
 * The Express server is identical to the desktop server.js,
 * but it listens only on localhost:3000 and communicates with
 * the Capacitor WebView via the capacitor-nodejs bridge.
 *
 * To use:
 *   1. npm install capacitor-nodejs
 *   2. npx cap sync android
 *   3. (Optional) If you disable auto-start, call in MainActivity:
 *        NodeJS.start("main.js");
 *
 * The WebView will reach the server at http://localhost:3000.
 */
'use strict';

// Notify the capacitor bridge that Node.js has started
try {
  const { NodeJS } = require('capacitor-nodejs');
  NodeJS.whenReady().then(() => {
    NodeJS.send({ eventName: 'nodeReady', args: [{ port: 3000 }] });
  });
} catch (err) {
  // Not running inside Capacitor (e.g., running in desktop mode) — expected
  if (err.code !== 'MODULE_NOT_FOUND') {
    console.warn('[server/main.js] capacitor-nodejs bridge error:', err.message);
  }
}

// Start the Express server on port 3000
const fs = require('fs');
const path = require('path');

process.env.PORT = process.env.PORT || '3000';

// Allow overriding the static root for packaged builds (e.g., Capacitor nodejs dir)
if (!process.env.NIGHTMARE_STATIC_ROOT) {
  process.env.NIGHTMARE_STATIC_ROOT = path.resolve(__dirname, '..');
}

try {
  process.chdir(process.env.NIGHTMARE_STATIC_ROOT);
} catch (err) {
  console.warn('[server/main.js] unable to set working directory:', err.message);
}

const serverEntry = (() => {
  const local = path.join(__dirname, 'server.js');
  if (fs.existsSync(local)) return local;

  const parent = path.join(__dirname, '..', 'server.js');
  if (fs.existsSync(parent)) return parent;

  throw new Error('[server/main.js] server.js not found');
})();

require(serverEntry);
