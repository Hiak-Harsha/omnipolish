/**
 * OmniPolish Background Service Worker
 * Handles Right-Click Context Menus and Extension Commands (Alt+Z, Alt+Q)
 */

chrome.runtime.onInstalled.addListener(() => {
  // Create Context Menu items
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

// Handle browser keyboard commands (e.g. Alt+Z)
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab || !tab.id) return;
  if (command === "toggle_pill") {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_pill" });
  } else if (command === "polish_selection") {
    chrome.tabs.sendMessage(tab.id, { action: "trigger_polish", mode: "auto" });
  }
});
