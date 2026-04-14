/* ============================================================
   Nightmare Code Console — Service Worker
   Provides offline caching so the app works without a network.
   Cache strategy: cache-first for assets, network-first for API.
   ============================================================ */
'use strict';

const CACHE_VERSION = 'v1';
const CACHE_NAME = `nightmare-code-console-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/animations.css',
  '/js/matrix.js',
  '/js/blood.js',
  '/js/editor.js',
  '/js/ai.js',
  '/js/plugins.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  // Monaco core (large but essential)
  '/vendor/monaco/vs/loader.js',
  '/vendor/monaco/vs/editor/editor.main.js',
  '/vendor/monaco/vs/editor/editor.main.nls.js',
  '/vendor/monaco/vs/editor/editor.main.css',
  // xterm.js
  '/vendor/xterm/lib/xterm.js',
  '/vendor/xterm/css/xterm.css',
  '/vendor/xterm-fit/lib/xterm-addon-fit.js',
  // marked + hljs
  '/vendor/marked/marked.min.js',
  '/vendor/hljs/highlight.min.js',
  '/vendor/hljs/styles/github-dark.min.css',
];

// ── Install: pre-cache critical assets ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache each URL individually so one failure doesn't block others
      const results = await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch((err) => {
          console.warn(`[SW] Failed to cache ${url}:`, err.message);
        }))
      );
      return results;
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('nightmare-code-console-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for assets, network-first for API ────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Network-first for API routes (AI, files, health)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for all other assets (static files, vendors)
  event.respondWith(cacheFirst(event.request));
});

// ── Cache-first strategy ─────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline — resource not cached', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ── Network-first strategy ────────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline — no cached response available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
