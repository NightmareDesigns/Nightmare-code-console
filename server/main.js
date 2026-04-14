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
 *   3. In Android MainActivity, add:
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
} catch {
  // Not running inside Capacitor (e.g., running in desktop mode) — ignore
}

// Start the Express server on port 3000
process.env.PORT = '3000';
require('../server.js');
