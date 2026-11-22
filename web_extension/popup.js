/**
 * OmniPolish Popup Script
 */

const API_BASE = "http://127.0.0.1:8765";

const statusEl = document.getElementById("status");
const modeEl = document.getElementById("mode");
const pillToggle = document.getElementById("pillToggle");
const testInput = document.getElementById("testInput");
const polishBtn = document.getElementById("polishBtn");
const promptBtn = document.getElementById("promptBtn");

// 1. Check daemon status
async function checkStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (res.ok) {
      const data = await res.json();
      statusEl.textContent = `● Online (${data.model || data.provider})`;
      statusEl.className = "status-badge online";
    } else {
      throw new Error();
    }
  } catch (err) {
    statusEl.textContent = "● Daemon Offline";
    statusEl.className = "status-badge";
    statusEl.title = "Start OmniPolish via start_tray.vbs to connect";
  }
}

// 2. Load and persist settings
chrome.storage?.sync?.get(["omnipolish_mode", "omnipolish_show_pill"], (data) => {
  if (data?.omnipolish_mode) {
    modeEl.value = data.omnipolish_mode;
  }
  if (data?.omnipolish_show_pill !== undefined) {
    pillToggle.checked = data.omnipolish_show_pill;
  }
});

modeEl.addEventListener("change", () => {
  chrome.storage?.sync?.set({ omnipolish_mode: modeEl.value });
});

pillToggle.addEventListener("change", () => {
  chrome.storage?.sync?.set({ omnipolish_show_pill: pillToggle.checked });
});

// 3. Test Sandbox Execution
async function runTest(mode) {
  const text = testInput.value.trim();
  if (!text) return;

  const btn = mode === "ai_prompt" ? promptBtn : polishBtn;
  const originalText = btn.textContent;
  btn.textContent = "Processing...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/format`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode: mode })
    });
    if (!res.ok) throw new Error("API returned error");
    const data = await res.json();
    testInput.value = data.formatted_text;
  } catch (err) {
    alert("Could not reach OmniPolish daemon.\nPlease ensure OmniPolish is running (start_tray.vbs)!");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

polishBtn.addEventListener("click", () => runTest(modeEl.value));
promptBtn.addEventListener("click", () => runTest("ai_prompt"));

checkStatus();
