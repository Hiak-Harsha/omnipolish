/**
 * OmniPolish Background Service Worker
 * Handles Right-Click Context Menus and Extension Events
 */

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu items
  chrome.contextMenus.create({
    id: "omnipolish_root",
    title: "✨ OmniPolish",
    contexts: ["selection", "editable"]
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
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  const mode = info.menuItemId === "omnipolish_prompt" ? "ai_prompt" : "auto";
  chrome.tabs.sendMessage(tab.id, {
    action: "trigger_polish",
    mode: mode,
    selectedText: info.selectionText || ""
  });
});
