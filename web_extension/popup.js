const API_BASE = "http://127.0.0.1:8765";

const statusEl = document.getElementById("status");
const modeEl = document.getElementById("mode");
const testInput = document.getElementById("testInput");
const polishBtn = document.getElementById("polishBtn");

// Check connection to OmniPolish backend
async function checkStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (res.ok) {
      const data = await res.json();
      statusEl.textContent = `● Online (${data.provider || "Active"})`;
      statusEl.className = "status-badge online";
    } else {
      throw new Error();
    }
  } catch (err) {
    statusEl.textContent = "● Daemon Offline (Start OmniPolish)";
    statusEl.className = "status-badge";
  }
}

// Load saved mode preference
chrome.storage?.sync?.get(["omnipolish_mode"], (data) => {
  if (data?.omnipolish_mode) {
    modeEl.value = data.omnipolish_mode;
  }
});

modeEl.addEventListener("change", () => {
  chrome.storage?.sync?.set({ omnipolish_mode: modeEl.value });
});

polishBtn.addEventListener("click", async () => {
  const text = testInput.value.trim();
  if (!text) return;

  polishBtn.textContent = "Polishing...";
  polishBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/format`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode: modeEl.value })
    });
    if (!res.ok) throw new Error("API returned error");
    const data = await res.json();
    testInput.value = data.formatted_text;
  } catch (err) {
    alert("Could not reach OmniPolish server. Make sure OmniPolish daemon is running!");
  } finally {
    polishBtn.textContent = "Polish Message";
    polishBtn.disabled = false;
  }
});

checkStatus();
