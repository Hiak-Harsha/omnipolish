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

## ⚡ Quick Start (Windows)

### 1. Launch OmniPolish
Double-click **`run.bat`** or run:
```powershell
cd C:\Users\madha\Desktop\omnipolish
.\.venv\Scripts\python.exe -m omnipolish.main --all
```

### 2. Supported Hotkeys
OmniPolish supports multiple conflict-free shortcuts out of the box:
* **`F8`** *(Easiest: single key press!)*
* **`Ctrl + Shift + R`** *(Standard)*
* **`Ctrl + Shift + Space`**
* **`Alt + Q`**

> **Note on `Ctrl + Alt + R`:** On Windows international keyboards, `Ctrl + Alt` functions as `AltGr`, which types the trademark symbol `®`. OmniPolish uses **`F8`** and **`Ctrl + Shift + R`** to avoid this issue.

### 3. How to Use Anywhere
1. Type a draft in **WhatsApp Desktop**, **Discord**, **Notepad**, or **any browser**:
   > `hey bro teh meeting is tomorrow at 5pm plz dont be late we need to submit project`
2. **Highlight the text** (drag mouse or press `Ctrl + A`).
3. Press **`F8`** (or **`Ctrl + Shift + R`**).
4. ✨ It immediately transforms into:
   > `Hey bro, the *meeting* is tomorrow at *5:00 PM*. Please don't be late—we need to submit the *project*.`

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
