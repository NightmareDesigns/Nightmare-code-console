# 🩸 Nightmare Code Console

> An AI-powered, horror-themed code editor inspired by VS Code and GitHub Codespaces — with a **Matrix rain** background, **blood drip** animations, and **NightmareAI** assistant built in.

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
│   └── index.js           # AI chat API (OpenAI-compatible)
├── plugins/
│   └── index.js           # Language plugin definitions (35+ languages)
├── public/
│   ├── index.html         # Main SPA shell
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

---

*Enter the nightmare. Code in the dark.*

