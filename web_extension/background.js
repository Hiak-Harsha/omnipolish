/**
 * OmniPolish Background Service Worker
 * Handles Right-Click Context Menus, Keyboard Shortcuts, and API Routing
 */

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "omnipolish_root",
      title: "✨ OmniPolish",
      contexts: ["selection", "editable", "page"]
    });

    chrome.contextMenus.create({
      parentId: "omnipolish_root",
      id: "omnipolish_polish",
      title: "💬 Polish & Highlight Message (Alt+Q)",
      contexts: ["selection", "editable"]
    });

    chrome.contextMenus.create({
      parentId: "omnipolish_root",
      id: "omnipolish_prompt",
      title: "🧠 Supercharge AI Prompt (Alt+P)",
      contexts: ["selection", "editable"]
    });

    chrome.contextMenus.create({
      parentId: "omnipolish_root",
      id: "omnipolish_toggle_pill",
      title: "⚡ Show / Hide Action Pill (Alt+Z)",
      contexts: ["selection", "editable", "page"]
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === "omnipolish_toggle_pill") {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_pill" });
    return;
  }

  const mode = info.menuItemId === "omnipolish_prompt" ? "ai_prompt" : "auto";
  chrome.tabs.sendMessage(tab.id, {
    action: "trigger_polish",
    mode: mode,
    selectedText: info.selectionText || ""
  });
});

// Handle browser keyboard commands (Alt+Z, Alt+Q)
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab || !tab.id) return;
  if (command === "toggle_pill") {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_pill" });
  } else if (command === "polish_selection") {
    chrome.tabs.sendMessage(tab.id, { action: "trigger_polish", mode: "auto" });
  }
});

// Route format requests through background service worker to guarantee 100% bypass of Webpage CSP & Mixed-Content blocks
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "format_text") {
    fetch("http://127.0.0.1:8765/api/format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: req.text, mode: req.mode || "auto" })
    })
      .then((res) => {
        if (!res.ok) throw new Error("API status " + res.status);
        return res.json();
      })
      .then((data) => {
        sendResponse({ success: true, data: data });
      })
      .catch((err) => {
        console.warn("[OmniPolish Background] Fetch error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }
});
