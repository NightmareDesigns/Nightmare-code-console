# 🩸 Nightmare Code Console

> An AI-powered, horror-themed code editor inspired by VS Code and GitHub Codespaces — with a **Matrix rain** background, **blood drip** animations, and **NightmareAI** assistant built in.
>
> Works **offline**, installable as a **PWA** on Android, and supports **local AI** via Ollama or LM Studio — no cloud required.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🖥️ **Monaco Editor** | The same engine powering VS Code — syntax highlighting, IntelliSense, 80+ languages |
| 🤖 **NightmareAI** | Built-in MiniCoder (offline) plus OpenAI/Gemini/Copilot/Tabby/local providers with editor context awareness |
| 🔑 **In-app AI Setup** | Enter API key, endpoint, and model right in Settings — no .env edits required |
| 🧠 **Multi-provider AI** | Switch between OpenAI-compatible, Gemini, GitHub Copilot, Tabby, Local (Ollama/LM Studio), or the built-in offline model |
| 🌧️ **Matrix Rain** | Animated green katakana/ASCII falling character background |
| 🩸 **Blood Drip FX** | CSS/Canvas blood dripping animations along the top of the UI |
| ⎇ **Source Control** | Git panel shows status, history, and lets you fetch/pull/push/commit without leaving the app |
| 🔌 **35+ Language Plugins** | Auto-detects language from filename; manually switch via the Plugins panel |
| 🧩 **VS Code Add-ons** | Track the VS Code extensions you rely on and copy install commands |
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
# 0. Install Node.js + npm if missing
bash scripts/install-node-npm.sh

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

### Windows 10 (Local AI desktop install)

1. Install prerequisites:
   - [Node.js 18+](https://nodejs.org/en/download/prebuilt) — or run `winget install OpenJS.NodeJS`
   - [Git](https://git-scm.com/download/win) — or `winget install Git.Git`
   - Optional local model runtime:
     - [Ollama for Windows](https://ollama.com/download) → `ollama serve` then `ollama pull codellama:7b`
     - or [LM Studio](https://lmstudio.ai/) → start the local server (defaults to `http://127.0.0.1:1234`)
2. Clone & configure:
```powershell
git clone https://github.com/NightmareDesigns/Nightmare-code-console.git
cd Nightmare-code-console
copy .env.example .env
```
3. Point the app at your local model (no cloud key required):
```env
AI_PREFER_LOCAL=true
AI_LOCAL_URL=http://127.0.0.1:11434/v1/chat/completions  # Ollama default
AI_LOCAL_MODEL=codellama:7b
AI_MOCK_MODE=false
```
4. Install & start:
```powershell
npm install
npm run build   # optional, copies vendors into dist/ for offline use
npm start
```
5. Open `http://localhost:3000` in Edge/Chrome and choose **Install this site as an app** (PWA). The service worker caches everything so the editor, Matrix rain, blood drip FX, terminal, and AI panel all work offline on Windows.

### Standalone Windows EXE (no Node.js required)

Package everything (Node runtime + assets) into a single Windows executable.

```powershell
# From the repo root
npm install
npm run build:standalone   # outputs releases/nightmare-code-console-win.exe
```

Build settings for the EXE live in `windows-build.json` (pkg targets, dist assets, release output path). Tweak it if you need a different Node target or extra assets included.

Usage:
- Double-click `releases/nightmare-code-console-win.exe` (or run in PowerShell) — it starts the server on `http://localhost:3000`.
- Optional: place a `.env` next to the EXE to override defaults (AI endpoint/model/port). Without it, the bundled defaults run in mock mode or local-first if you set them before building.
- Gemini ready: drop a `.env` beside the EXE with `AI_PROVIDER=gemini`, `AI_GEMINI_API_KEY=<your_key>`, and optionally `AI_GEMINI_MODEL=gemini-1.5-flash` to run against Gemini without changing code.
- In the browser, choose **Install this site as an app** to pin it like a native editor. Everything is cached for offline use.

### Run with Docker

```bash
# Build and start
docker compose up -d

# Or build manually
docker build -t nightmare-code-console .
docker run -p 3000:3000 nightmare-code-console
```

### Run on Termux (Android Terminal)

You can run Nightmare Code Console directly in Termux on your Android device:

```bash
# 1. Install Termux from F-Droid (recommended) or Play Store
# 2. Update packages
pkg update && pkg upgrade

# 3. Install Node.js and Git
pkg install nodejs git

# 4. Clone the repository
git clone https://github.com/NightmareDesigns/Nightmare-code-console.git
cd Nightmare-code-console

# 5. Install dependencies
npm install

# 6. Start the server
npm start

# 7. Open in browser
# The app will run on http://localhost:3000
# Open it in Chrome or any browser on your Android device
```

**Termux Tips:**
- Use `npm run dev` for auto-restart on file changes
- The server binds to `0.0.0.0:3000` by default, accessible from your device
- To access from other devices on your LAN, use your device's IP address
- Storage access: Run `termux-setup-storage` to access device files
- Keep Termux running: Use a wake lock app or enable "Acquire wakelock" in Termux settings

---

## 🤖 AI Configuration

The AI assistant works in **mock mode** out of the box (no API key needed). To enable real AI:

1. Copy `.env.example` to `.env`
2. Set your `AI_API_KEY` (OpenAI or any compatible API)
3. Restart the server

Supports any OpenAI-compatible endpoint — change `AI_API_URL` and `AI_MODEL` in `.env`.

**Built-in MiniCoder (offline):**
- In Settings → AI, pick **Built-in Mini (offline)** to use the bundled MiniCoder without any network calls or API keys.
- Switch to OpenAI/Gemini/Copilot/Tabby/Local when you want fuller model responses.

---

## ⎇ Source Control Panel

- Open the **Git** tab to see branch, upstream, ahead/behind counts, and changed files.
- Use **Refresh** to resync status, **Fetch/Pull/Push** for remote updates, and **Stage & Commit** with a message to record changes.
- Set your upstream (e.g., `origin/main`) before pulling or pushing. If credentials are required, the underlying git command will prompt/return an error in the panel.
If you set `AI_GEMINI_API_KEY` and leave `AI_PROVIDER` unset, the server will default to Gemini automatically (handy for Windows builds with a `.env` beside the EXE).

Prefer not to edit `.env`? Open **Settings → AI** inside the app to paste your API key, endpoint URL, model name, and choose a provider (OpenAI-compatible, Gemini, GitHub Copilot, or Local). Those values are stored in your browser (never written to disk on the server) and applied to every AI request immediately.

### Provider quick setup

- **Gemini**: Select Gemini in Settings and provide your Gemini API key. The endpoint now auto-fills for the chosen model (defaults to `gemini-3.1-flash`). Quick picks: `gemini-3.1-pro`, `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-pro`, `gemini-1.5-flash-8b`, `gemini-1.5-flash-lite`, `gemini-1.0-pro`.
- **GitHub Copilot**: Select Copilot, provide the Copilot API endpoint/key from your account, and choose a model (defaults to `gpt-4o` style).
- **Tabby**: Select Tabby to use a self-hosted Tabby server (OpenAI-compatible). Defaults: URL `http://127.0.0.1:8080/v1/chat/completions`, model `TabbyML/StarCoder2-15B`, no API key needed unless you configured one.
- **Local (Ollama / LM Studio)**: Select Local or toggle **Local / Network AI** and set the server URL and model (e.g., `http://localhost:11434/v1/chat/completions`, `codellama:7b`).

Mock mode now produces contextual sample guidance; add a real key to exit mock mode.

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

Prefer to always default to a local model on desktop (Windows/macOS/Linux)? Set `AI_PREFER_LOCAL=true` and leave `AI_API_KEY` empty — the server will automatically use `AI_LOCAL_URL`/`AI_LOCAL_MODEL` instead of mock mode.

### UI Toggle (Quick Switch)

Open **Settings → Local / Network AI** to toggle local AI and set the server URL and model name without editing `.env`. Settings are saved in browser localStorage and applied instantly to the AI requests sent by the app.

---

## 🧩 VS Code Add-on Modules

Keep track of the VS Code extensions you want alongside Nightmare Code Console:

- Open **Settings → VS Code Add-on Modules**
- Add extension IDs (e.g., `ms-python.python`, `esbenp.prettier-vscode`) plus optional marketplace links and GitHub repos
- Click **Copy install** to grab the `code --install-extension <id>` command for your desktop VS Code
- Entries are stored in your browser, so you can curate a personalized list without editing files

---

## 📱 PWA / Android Installation

### "Add to Home Screen" (any browser — no build needed)

1. Open `http://localhost:3000` (or your deployed URL) in Chrome on Android
2. Tap the browser menu → **Add to Home Screen**
3. The app installs as a standalone app with offline support

The Service Worker caches all assets on first load — the IDE works even when offline.

### Android APK via Capacitor

Build a native Android APK that bundles the full Node.js server on-device.

#### Automated Build (GitHub Actions)

The easiest way to get an APK is through the GitHub Actions workflow:

1. **Trigger the workflow:**
   - Go to the **Actions** tab in your GitHub repository
   - Select **"Build Android APK"**
   - Click **"Run workflow"** → **"Run workflow"**

2. **Download the APK:**
   - Wait for the workflow to complete (~5-10 minutes)
   - Click on the completed workflow run
   - Scroll down to **Artifacts**
   - Download **`nightmare-code-console-debug.apk`**

3. **Install on Android:**
   - Transfer the APK to your Android device
   - Enable "Install from unknown sources" in Settings
   - Tap the APK file to install

The workflow automatically:
- Installs all dependencies
- Builds web assets
- Configures Capacitor
- Compiles the Android APK
- Uploads the APK as a downloadable artifact

#### Manual Build (Local)

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

# 4. Add the Android platform (creates android/ folder)
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
