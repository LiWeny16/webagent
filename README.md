
# 🐾 AI Agent - Smart Browser Assistant with a Cute Face

**AI Agent** is a browser-based AI assistant powered by multiple LLM backends (OpenAI, Gemini, DeepSeek, Grok). It provides real-time content summarization, natural conversation, writing assistance, and even webpage parsing — all via a charming and intuitive interface featuring a cartoon cat mascot.

---

## ✨ Features

- 🔌 **Multi-provider support**: Plug into OpenAI, Google Gemini, DeepSeek, or Grok APIs.
- 🧠 **Context-aware chat**: Maintain conversational memory with smart token trimming.
- 📄 **Webpage summarization**: Automatically extract content from current page using DOM parsing.
- ⚙️ **Command-based execution**: Supports custom commands like `@总结页面` with JSON-based action handling.
- 🌐 **Internet-aware responses**: When necessary, the AI can request to fetch live webpage content.
- ⏳ **Streaming support**: Real-time text generation with stream handlers.
- ❌ **Abort & partial recovery**: Graceful interruption support with fallback to partial content.
- 🐱 **Fun and friendly UI**: Features a lovable 2D kitten as your assistant avatar.

---

## 🧪 Local Development

### 📦 Install dependencies

```bash
npm install
```

### 🚀 Run locally

```bash
npm run dev
```

### 🛠️ Build and zip for extension upload

```bash
npm run zip
```

> This will build the project and generate a `build.zip` file from the `dist/` folder, ready to be submitted to the Microsoft Edge Add-ons store.

---

## 🔐 Settings

Settings are retrieved via `getSettings()` and include:

- API keys per provider
- Model choices per provider
- Default temperature and streaming preferences

You can store these securely within the plugin's internal settings UI or synced storage.

---

## 🧰 API Providers

Supported providers include:

- **OpenAI** (`gpt-3.5-turbo`, `gpt-4`)
- **Grok (xAI)** (`grok-2`)
- **Google Gemini** (`gemini-pro`, `gemini-1.5`)
- **DeepSeek** (`deepseek-chat`)

Each provider has tailored support for streaming and token handling. Requests are routed dynamically based on configuration.

---

## 🧠 Command Presets

Commands are issued as structured JSON and interpreted by the assistant, for example:

```json
{
  "action": "READ_DOM",
  "selector": "main",
  "includeText": true
}
```

These commands enable contextually rich interactions with webpages.

---

## 🧩 File Structure

```
├── src/
│   ├── index.tsx           # UI entry point
│   ├── agent.ts            # ChatSession and LLM routing
│   ├── zip.js              # One-click builder & packager
│   └── text/
│       └── parse.ts        # Content summarization logic
├── dist/                   # Build output
├── public/                 # Extension assets (manifest, icons)
├── package.json
└── README.md
```

---

## 🧷 License

MIT — free to use and modify with attribution.
