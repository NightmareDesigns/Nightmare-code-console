# 🩸 Nightmare Code Console

> An AI-powered, horror-themed code editor inspired by VS Code and GitHub Codespaces — with a **Matrix rain** background, **blood drip** animations, and **NightmareAI** assistant built in.
>
> Works **offline**, installable as a **PWA** on Android, and supports **local AI** via Ollama or LM Studio — no cloud required.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🖥️ **Monaco Editor** | The same engine powering VS Code — syntax highlighting, IntelliSense, 80+ languages |
| 🤖 **NightmareAI** | OpenAI-compatible AI assistant with editor context awareness |
| 🌧️ **Matrix Rain** | Animated green katakana/ASCII falling character background |
| 🩸 **Blood Drip FX** | CSS/Canvas blood dripping animations along the top of the UI |
| 🔌 **35+ Language Plugins** | Auto-detects language from filename; manually switch via the Plugins panel |
| 📁 **File Explorer** | Browse and open files from the local filesystem |
| 💻 **Integrated Terminal** | xterm.js-powered terminal with Nightmare color theme |
| ⚙️ **Settings Panel** | Font size, tab width, word wrap, minimap, animation toggles |
| 📱 **PWA / Android** | "Add to Home Screen" installable; full Android APK via Capacitor |
| 🔌 **Offline Support** | Service Worker caches all assets — works without internet |
| 🧠 **Local AI** | Point to Ollama or LM Studio — run AI completely on your machine |
| 🐳 **Docker Ready** | Run locally or deploy to any server via Docker/Docker Compose |
| ♿ **Accessible** | ARIA roles and labels throughout |

---

## 🚀 Quick Start

### Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/NightmareDesigns/Nightmare-code-console.git
cd Nightmare-code-console

# 2. Install dependencies
npm install

# 3. Configure (optional — AI works in mock mode without a key)
cp .env.example .env
# Edit .env and add your OpenAI API key

# 4. Start the server
npm start

# 5. Open in browser
open http://localhost:3000
```

### Run with Docker

```bash
# Build and start
docker compose up -d

# Or build manually
docker build -t nightmare-code-console .
docker run -p 3000:3000 nightmare-code-console
```

---

## 🤖 AI Configuration

The AI assistant works in **mock mode** out of the box (no API key needed). To enable real AI:

1. Copy `.env.example` to `.env`
2. Set your `AI_API_KEY` (OpenAI or any compatible API)
3. Restart the server

Supports any OpenAI-compatible endpoint — change `AI_API_URL` and `AI_MODEL` in `.env`.

```env
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-...
AI_MODEL=gpt-4o
AI_MOCK_MODE=false
```

---

## 🧠 Local AI (Ollama / LM Studio)

Run the AI assistant **completely offline** on your own machine — no API key, no cloud.

### Using Ollama

```bash
# 1. Install Ollama
#    macOS/Linux: curl -fsSL https://ollama.com/install.sh | sh
#    Windows:     https://ollama.com/download

# 2. Start the Ollama server (runs on port 11434)
ollama serve

# 3. Pull a coding model
ollama pull codellama:7b        # ~4 GB — best for code
ollama pull deepseek-coder:6.7b # ~4 GB — excellent for code
ollama pull mistral:7b          # ~4 GB — great general model

# 4. Configure Nightmare Code Console to use Ollama
```

In your `.env`:

```env
AI_API_URL=http://localhost:11434/v1/chat/completions
AI_API_KEY=
AI_MODEL=codellama:7b
AI_MOCK_MODE=false
```

### Using LM Studio

1. Download [LM Studio](https://lmstudio.ai/) and load a GGUF model
2. Start the local server (default: `http://localhost:1234`)
3. Set in `.env`:

```env
AI_API_URL=http://localhost:1234/v1/chat/completions
AI_API_KEY=lm-studio
AI_MODEL=local-model
AI_MOCK_MODE=false
```

### UI Toggle (Quick Switch)

Open **Settings → Local / Network AI** to toggle local AI and set the server URL and model name without editing `.env`. Settings are saved in browser localStorage.

---

## 📱 PWA / Android Installation

### "Add to Home Screen" (any browser — no build needed)

1. Open `http://localhost:3000` (or your deployed URL) in Chrome on Android
2. Tap the browser menu → **Add to Home Screen**
3. The app installs as a standalone app with offline support

The Service Worker caches all assets on first load — the IDE works even when offline.

### Android APK via Capacitor

Build a native Android APK that bundles the full Node.js server on-device.

#### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Android Studio](https://developer.android.com/studio) with Android SDK (API 22+)
- Java 17+ (bundled with Android Studio)

#### Build steps

```bash
# 1. Install Capacitor CLI and Android platform
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Install capacitor-nodejs (embeds Node.js Mobile in the APK)
npm install capacitor-nodejs

# 3. Build the static web assets into dist/
npm run build

# 4. Initialize Capacitor (first time only)
npx cap init "Nightmare Code Console" "com.nightmaredesigns.codeconsole" --web-dir dist

# 5. Add the Android platform (creates android/ folder)
npx cap add android

# 6. Sync web assets to Android
npx cap sync android

# 7. Open in Android Studio and build the APK
npx cap open android
# In Android Studio: Build → Generate Signed Bundle/APK
# Or for a quick debug build: Build → Build APK
```

Alternatively, use the npm shortcuts:

```bash
npm run cap:sync   # build + sync
npm run cap:open   # open Android Studio
npm run cap:run    # deploy to connected device/emulator
```

#### Local AI on Android

| Option | How to set up |
|--------|--------------|
| **Ollama on desktop (LAN)** | Run Ollama on your PC; set `AI_API_URL=http://192.168.x.x:11434/v1/chat/completions` in `.env` before building |
| **MLC LLM on device** | Install [MLC LLM](https://mlc.ai/mlc-llm) Android APK; set `AI_API_URL=http://localhost:8080/v1/chat/completions` |
| **llama.cpp server on device** | Build llama.cpp for Android ARM; run `./server -m model.gguf --port 8080` |

See [`server/README.md`](server/README.md) for the capacitor-nodejs integration details.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+A` | Toggle AI panel |
| `Ctrl+`` ` | Toggle terminal |
| `Ctrl+T` | New tab |
| `F5` | Run code |
| `Ctrl+Enter` | Send AI message |
| `Escape` | Close modal |

---

## 🏗️ Project Structure

```
nightmare-code-console/
├── server.js              # Express server + WebSocket
├── ai/
│   └── index.js           # AI chat API (OpenAI-compatible, local AI support)
├── plugins/
│   └── index.js           # Language plugin definitions (35+ languages)
├── public/
│   ├── index.html         # Main SPA shell
│   ├── manifest.json      # PWA Web App Manifest
│   ├── sw.js              # Service Worker (offline caching)
│   ├── icons/             # PWA icons
│   ├── css/
│   │   ├── main.css       # Core UI stylesheet
│   │   └── animations.css # Matrix, blood drip, UI animations
│   └── js/
│       ├── matrix.js      # Matrix rain canvas animation
│       ├── blood.js       # Blood drip animation controller
│       ├── editor.js      # Monaco editor manager & tab system
│       ├── ai.js          # AI chat panel with markdown rendering
│       ├── plugins.js     # Language plugin switcher
│       └── app.js         # App controller (shortcuts, settings, terminal)
├── server/
│   └── main.js            # capacitor-nodejs entry point (Android embedded server)
├── scripts/
│   └── build-android.js   # Copies public/ + vendors → dist/ for Capacitor
├── capacitor.config.json  # Capacitor configuration
├── dist/                  # Static build output (gitignored, created by npm run build)
├── android/               # Generated by `npx cap add android` (gitignored)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## 🩸 Credits

Built with:
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — VS Code's editor engine
- [xterm.js](https://xtermjs.org/) — Terminal emulator
- [Express](https://expressjs.com/) — Node.js web server
- [marked.js](https://marked.js.org/) — Markdown rendering
- [Capacitor](https://capacitorjs.com/) — Native Android wrapper
- [Ollama](https://ollama.com) — Local AI model runtime

---

*Enter the nightmare. Code in the dark.*

