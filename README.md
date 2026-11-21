# ✨ OmniPolish: Universal AI Text Polisher, Autocorrector & Highlighter

> **Autocorrects, structures, and strategically highlights key points in your messages across ALL platforms** — WhatsApp, Instagram, ChatGPT, Gemini, Slack, Discord, Gmail, and any native desktop or web app.

---

## 🚀 How It Works (Universal Architecture)

```
                              ┌────────────────────────────────────────┐
                              │           OmniPolish Core Engine        │
                              │   (Autocorrect, Formatting, Highlighting)│
                              └──────────────────▲─────────────────────┘
                                                 │
                   ┌─────────────────────────────┼─────────────────────────────┐
                   │                             │                             │
        ┌──────────▼───────────┐      ┌──────────▼───────────┐      ┌──────────▼───────────┐
        │  Windows Desktop Hook │      │  Browser Extension   │      │  Mobile Keyboard     │
        │ (Ctrl+Shift+R or F8) │      │  (Alt+R in Chrome)   │      │ (Android IME / iOS)  │
        │ - WhatsApp Desktop   │      │ - WhatsApp Web       │      │ - WhatsApp Mobile    │
        │ - Discord / Slack    │      │ - Instagram Web      │      │ - Instagram Mobile   │
        │ - Word, Outlook, etc.│      │ - ChatGPT / Gemini   │      │ - Telegram, Notes    │
        └──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

1. **System-Wide Desktop Daemon (`omnipolish/desktop`):**
   * Operates at the OS clipboard/input layer.
   * Highlight text anywhere $\rightarrow$ press **`F8`** or **`Ctrl + Shift + R`** $\rightarrow$ automatically replaces the text with the polished, highlighted version.
2. **Local REST API Server (`omnipolish/server`):**
   * Runs locally at `http://127.0.0.1:8765`.
   * Serves formatting requests to the **Browser Extension** and future **Mobile Keyboard bridges**.
3. **Multi-AI Engine (`omnipolish/core`):**
   * **Gemini Flash (Recommended)**: Ultra-fast (~150-250ms), fixes typos, adds bullet points, and bolds critical info.
   * **Groq / OpenAI**: High-speed Llama 3.3 or GPT models.
   * **Ollama (100% Offline)**: Runs on local machine (e.g. `llama3.2`).
   * **Rule-Based Fallback**: Works immediately even without an internet connection or API key.

---

## ⚡ Launch Options (Windows)

### Option A: Silent Background Mode (Zero Console Window - Recommended)
Double-click **`start_tray.vbs`** (or **`start_tray.bat`**):
* OmniPolish launches silently directly into your **Windows System Tray** (notification area next to the clock).
* **Zero black command prompt window.**
* Right-click the tray icon to switch formatting styles, toggle pause, open settings, or set it to **Run on Windows Startup**.
* To stop OmniPolish anytime: right-click tray icon $\rightarrow$ **Exit**, or double-click **`stop.bat`**.

### Option B: Terminal Mode (With Live Debug Logs)
Double-click **`run.bat`**:
* Displays live logs showing captured text, response times, and which SLM model handled each shortcut.

---

## ⌨️ Global Shortcuts (Conflict-Free)

| Shortcut | Function | Typical Apps |
| :--- | :--- | :--- |
| **`Alt + Q`** *(or `F8`)* | **💬 Message Polisher & Highlighter** | WhatsApp, Slack, Teams, Gmail, Instagram DMs |
| **`Alt + P`** *(or `Ctrl + Shift + P`)* | **🧠 AI Prompt Supercharger** | ChatGPT, Gemini, Claude, Developer Tools |

> **Note on Laptops:** On laptops where function keys (`F1`-`F12`) control volume/brightness, use **`Alt + Q`** and **`Alt + P`**—they never require the `Fn` key and never conflict with hardware settings!

---

## 💡 How to Use
1. Click inside any message or prompt box (or highlight specific text).
2. Press **`Alt + Q`** to polish messages, or **`Alt + P`** to supercharge an AI prompt.
3. OmniPolish wipes out the old draft and inserts the clean, formatted version in-place!

---

## 🌐 Chrome / Edge Extension Setup

To use OmniPolish directly inside browser text areas (WhatsApp Web, Instagram Web, ChatGPT):

1. Open Chrome or Edge and go to `chrome://extensions/`.
2. Toggle on **Developer mode** (top right corner).
3. Click **Load unpacked** (top left).
4. Select the folder: `C:\Users\madha\Desktop\omnipolish\web_extension`.
5. Now, while typing in any web input, press **`Alt + R`** to polish!

---

## ⚙️ Configuration (`config.json`)

To enable full AI intelligence with Gemini:
Open `config.json` and set your free Gemini API key:
```json
{
  "provider": "gemini",
  "api_key": "YOUR_GEMINI_API_KEY",
  "model": "gemini-2.0-flash",
  "hotkey": "<ctrl>+<shift>+r",
  "default_mode": "auto"
}
```
*You can get a free key instantly at [Google AI Studio](https://aistudio.google.com/).*

### Highlighting Modes
* `"whatsapp"`: Uses `*bold*` and clean spacing for WhatsApp.
* `"markdown"`: Uses standard `**bold**` and lists for ChatGPT, Gemini, Slack, and emails.
* `"plain"`: Uses clean bullet points `•` and capitalization for Instagram DMs / SMS.
* `"auto"`: Adapts automatically.
