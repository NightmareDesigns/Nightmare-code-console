# server/ — capacitor-nodejs entry point

This folder contains the Node.js entry point used by the
[capacitor-nodejs](https://github.com/hampoelz/Capacitor-NodeJS) plugin,
which embeds Node.js Mobile inside the Android APK.

## How it works

1. When the Android app starts, Capacitor launches `server/main.js` in a
   background Node.js thread via `NodeJS.start("main.js")`.
2. `main.js` starts the Express server on `http://localhost:3000`.
3. The Capacitor WebView loads the app from the `dist/` web assets but all
   API calls (AI, file system, WebSocket) go to `http://localhost:3000`
   on the device — **no internet required**.

## Setup

```bash
# Install capacitor-nodejs
npm install capacitor-nodejs

# Copy Node.js Mobile binaries into the Android project
npx cap sync android

# Open Android Studio
npx cap open android
```

Then in `android/app/src/main/java/.../MainActivity.java` (or Kotlin equivalent):

```java
import com.hampoelz.capacitor.nodejs.NodeJS;

// In onCreate:
NodeJS.start("main.js");
```

## Local AI on Android

The server proxies AI requests to `AI_API_URL` (from `.env` or env vars
injected at build time). For on-device offline AI, point `AI_API_URL` at a
local server running on the same device or on the local network:

| Option | Description |
|--------|-------------|
| **Ollama on desktop** | Run Ollama on your PC, set `AI_API_URL=http://192.168.x.x:11434/v1/chat/completions` |
| **MLC LLM app** | Install MLC LLM Android APK (exposes port 8080), set `AI_API_URL=http://localhost:8080/v1/chat/completions` |
| **llama.cpp server** | Build llama.cpp for Android, run `./server -m model.gguf --port 8080` |
