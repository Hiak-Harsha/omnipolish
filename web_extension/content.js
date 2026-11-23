/**
 * OmniPolish Content Script
 * - Injects Floating Action Pill with Instant Dismiss ('✕') and Auto-show preferences
 * - Handles 'Alt+Z' command to summon / dismiss the pill on demand
 * - Handles In-Page Hotkeys (Alt+Q for Polish, Alt+P for Prompt, Esc for Dismiss)
 * - Safe, non-destructive text replacement for WhatsApp Web (Lexical), ChatGPT (ProseMirror), Gmail, etc.
 * - Enforces Zero-Asterisk Unicode Bold formatting for chat messages
 */

(function () {
  const API_ENDPOINT = "http://127.0.0.1:8765/api/format";
  const isWhatsApp = window.location.hostname.includes("whatsapp.com");

  let activeElement = null;
  let pillContainer = null;
  let pillShadow = null;
  let hidePillTimeout = null;

  // Settings & Dismissal State
  let showPillSetting = true;
  let isDismissedForCurrentFocus = false;

  let savedRange = null;
  let savedSelectedText = "";
  let selectionStartIdx = -1;
  let selectionEndIdx = -1;

  // 1. Load user preferences
  chrome.storage?.sync?.get(["omnipolish_show_pill"], (data) => {
    if (data?.omnipolish_show_pill !== undefined) {
      showPillSetting = data.omnipolish_show_pill;
    }
  });

  chrome.storage?.onChanged?.addListener((changes) => {
    if (changes.omnipolish_show_pill) {
      showPillSetting = changes.omnipolish_show_pill.newValue;
      if (!showPillSetting && pillContainer) {
        pillContainer.style.display = "none";
      }
    }
  });

  // 2. Track mouse text selection across the page
  document.addEventListener("selectionchange", () => {
    if (isDismissedForCurrentFocus) return;

    // Check standard window selection (contenteditable / text)
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
      savedSelectedText = sel.toString().trim();
      try {
        savedRange = sel.getRangeAt(0).cloneRange();
      } catch (e) {
        savedRange = null;
      }

      const container = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
      const editable = container?.closest('textarea, input[type="text"], [contenteditable="true"]');
      if (editable) {
        activeElement = editable;
      }
      if (showPillSetting && savedRange) {
        positionPillNearRange(savedRange);
      }
      return;
    }

    // Check textarea or text input selection
    const active = document.activeElement;
    if (active && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && active.type === "text"))) {
      const sStart = active.selectionStart;
      const sEnd = active.selectionEnd;
      if (typeof sStart === "number" && typeof sEnd === "number" && sStart !== sEnd) {
        savedSelectedText = active.value.substring(sStart, sEnd).trim();
        selectionStartIdx = sStart;
        selectionEndIdx = sEnd;
        activeElement = active;
        if (showPillSetting) {
          positionPillNearElement(active);
        }
        return;
      }
    }

    savedSelectedText = "";
    selectionStartIdx = -1;
    selectionEndIdx = -1;
  });

  // Reset dismissal state when user moves to another field
  document.addEventListener("focusin", (e) => {
    isDismissedForCurrentFocus = false;
    const target = e.target;
    if (
      target &&
      (target.tagName === "TEXTAREA" ||
       (target.tagName === "INPUT" && target.type === "text") ||
       target.isContentEditable)
    ) {
      activeElement = target;
      if (showPillSetting) {
        showPillFor(target);
      }
    }
  }, true);

  document.addEventListener("focusout", (e) => {
    hidePillWithDelay();
  }, true);

  // --- 3. SHADOW DOM FLOATING ACTION PILL ---
  function initFloatingPill() {
    if (pillContainer) return;

    pillContainer = document.createElement("div");
    pillContainer.id = "omnipolish-pill-root";
    pillContainer.style.cssText = "position: absolute; z-index: 2147483647; display: none; pointer-events: auto;";

    // Prevent mousedown on pill from taking focus away from editable input
    pillContainer.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    document.body.appendChild(pillContainer);

    pillShadow = pillContainer.attachShadow({ mode: "open" });
    pillShadow.innerHTML = `
      <style>
        .pill-wrapper {
          display: flex;
          align-items: center;
          background: #0f172a;
          border: 1px solid #38bdf8;
          border-radius: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), 0 0 10px rgba(56, 189, 248, 0.25);
          padding: 3px 6px;
          gap: 4px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          user-select: none;
          transition: all 0.2s ease;
        }
        .pill-btn {
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s, color 0.15s;
        }
        .pill-btn:hover {
          background: #1e293b;
          color: #38bdf8;
        }
        .pill-btn.prompt-btn:hover {
          color: #a855f7;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 10px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s, background 0.15s;
        }
        .close-btn:hover {
          color: #f87171;
          background: #1e293b;
        }
        .divider {
          width: 1px;
          height: 14px;
          background: #334155;
          margin: 0 2px;
        }
        .sparkle-icon {
          font-size: 13px;
        }
        .spinner {
          display: none;
          width: 12px;
          height: 12px;
          border: 2px solid #38bdf8;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading .spinner { display: inline-block; }
        .loading .sparkle-icon { display: none; }
      </style>
      <div class="pill-wrapper" id="wrapper">
        <button class="pill-btn" id="polishBtn" title="Polish & Highlight (Alt+Q)">
          <span class="sparkle-icon">✨</span>
          <span class="spinner"></span>
          <span>Polish</span>
        </button>
        <button class="pill-btn prompt-btn" id="promptBtn" title="Supercharge for ChatGPT/Gemini (Alt+P)">
          <span>🧠 Prompt</span>
        </button>
        <div class="divider"></div>
        <button class="close-btn" id="closeBtn" title="Dismiss for now (Esc) / Alt+Z to summon">✕</button>
      </div>
    `;

    const polishBtn = pillShadow.getElementById("polishBtn");
    const promptBtn = pillShadow.getElementById("promptBtn");
    const closeBtn = pillShadow.getElementById("closeBtn");

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dismissPill();
    });

    polishBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      executePolish("auto");
    });

    promptBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      executePolish("ai_prompt");
    });
  }

  function dismissPill() {
    isDismissedForCurrentFocus = true;
    if (pillContainer) {
      pillContainer.style.display = "none";
    }
  }

  function togglePillOnCommand() {
    initFloatingPill();
    if (pillContainer && pillContainer.style.display === "block") {
      dismissPill();
    } else {
      isDismissedForCurrentFocus = false;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
        try {
          const r = sel.getRangeAt(0);
          positionPillNearRange(r);
          return;
        } catch (e) {}
      }

      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && active.type === "text") || active.isContentEditable)) {
        activeElement = active;
        positionPillNearElement(active);
      }
    }
  }

  function positionPillNearElement(el) {
    if (!el) return;
    initFloatingPill();
    if (!pillContainer) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const top = window.scrollY + rect.bottom - 36;
    const left = window.scrollX + rect.right - 165;

    pillContainer.style.top = `${Math.max(window.scrollY + 5, top)}px`;
    pillContainer.style.left = `${Math.max(window.scrollX + 5, left)}px`;
    pillContainer.style.display = "block";
  }

  function positionPillNearRange(range) {
    if (!range) return;
    initFloatingPill();
    if (!pillContainer) return;

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const top = window.scrollY + rect.bottom + 6;
    const left = window.scrollX + rect.left;

    pillContainer.style.top = `${Math.max(window.scrollY + 5, top)}px`;
    pillContainer.style.left = `${Math.max(window.scrollX + 5, left)}px`;
    pillContainer.style.display = "block";
    clearTimeout(hidePillTimeout);
  }

  function showPillFor(el) {
    if (isDismissedForCurrentFocus) return;
    activeElement = el;
    clearTimeout(hidePillTimeout);
    positionPillNearElement(el);
  }

  function hidePillWithDelay() {
    clearTimeout(hidePillTimeout);
    hidePillTimeout = setTimeout(() => {
      if (!savedSelectedText && pillContainer) {
        pillContainer.style.display = "none";
      }
    }, 600);
  }

  // --- 4. UNICODE BOLD & TEXT INJECTION (ZERO ASTERISKS) ---
  function toUnicodeBold(str) {
    if (!str) return "";
    let res = str.replace(/\*{1,2}([^*\n]+?)\*{1,2}/g, (match, inner) => {
      let b = "";
      for (let i = 0; i < inner.length; i++) {
        const code = inner.charCodeAt(i);
        if (code >= 65 && code <= 90) {
          b += String.fromCodePoint(code - 65 + 0x1D5D4);
        } else if (code >= 97 && code <= 122) {
          b += String.fromCodePoint(code - 97 + 0x1D5EE);
        } else if (code >= 48 && code <= 57) {
          b += String.fromCodePoint(code - 48 + 0x1D7EC);
        } else {
          b += inner[i];
        }
      }
      return b;
    });

    res = res.replace(/^\*\s+/gm, "• ");
    res = res.replace(/\n\*\s+/g, "\n• ");
    res = res.replace(/\*{1,2}/g, "");
    return res;
  }

  function getFullElementText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
      return el.value || "";
    }
    if (el.isContentEditable) {
      return el.innerText || el.textContent || "";
    }
    return "";
  }

  function replaceElementText(el, newText, isPartialSelection = false, mode = "auto") {
    if (!el && !isPartialSelection) return;

    if (mode !== "ai_prompt") {
      newText = toUnicodeBold(newText);
    }

    // A. Replace mouse-selected text in <textarea> or <input>
    if (isPartialSelection && el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text"))) {
      el.focus();
      const start = selectionStartIdx >= 0 ? selectionStartIdx : el.selectionStart;
      const end = selectionEndIdx >= 0 ? selectionEndIdx : el.selectionEnd;
      if (typeof start === "number" && typeof end === "number" && start !== end) {
        el.setRangeText(newText, start, end, "end");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        document.execCommand("insertText", false, newText);
      }
      savedSelectedText = "";
      selectionStartIdx = -1;
      selectionEndIdx = -1;
      return;
    }

    // B. Replace mouse-selected text in ContentEditable (WhatsApp Web, ChatGPT, Claude, Gmail)
    if (isPartialSelection && savedRange) {
      if (el) el.focus();
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);

        const success = document.execCommand("insertText", false, newText);
        if (!success) {
          savedRange.deleteContents();
          const node = document.createTextNode(newText);
          savedRange.insertNode(node);
        }

        if (el) {
          el.dispatchEvent(new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: newText
          }));
        }
      } catch (e) {
        savedRange.deleteContents();
        savedRange.insertNode(document.createTextNode(newText));
      }
      savedSelectedText = "";
      savedRange = null;
      return;
    }

    // C. Replace the entire input field
    if (el) el.focus();
    if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text"))) {
      el.select();
      const success = document.execCommand("insertText", false, newText);
      if (!success || el.value !== newText) {
        el.value = newText;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (el && el.isContentEditable) {
      // For WhatsApp Web (Lexical) and ChatGPT (ProseMirror): select all content and insertText seamlessly
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, newText);

      // Synthetic InputEvent ensures WhatsApp Web Send button is fully enabled
      el.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: newText
      }));
    }
  }

  // --- 5. POLISH EXECUTION ---
  async function executePolish(mode = "auto") {
    let textToPolish = "";
    let isPartial = false;

    if (savedSelectedText && savedSelectedText.length > 0) {
      textToPolish = savedSelectedText;
      isPartial = true;
    } else if (activeElement) {
      textToPolish = getFullElementText(activeElement).trim();
      isPartial = false;
    } else {
      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.isContentEditable)) {
        activeElement = active;
        textToPolish = getFullElementText(active).trim();
      }
    }

    if (!textToPolish) return;

    if (pillShadow) {
      pillShadow.getElementById("wrapper")?.classList.add("loading");
    }

    let effectiveMode = mode;
    if (effectiveMode === "auto") {
      if (isWhatsApp) {
        effectiveMode = "whatsapp";
      } else {
        const stored = await chrome.storage?.sync?.get(["omnipolish_mode"]);
        effectiveMode = stored?.omnipolish_mode || "auto";
      }
    }

    const onComplete = (output) => {
      if (output) {
        replaceElementText(activeElement, output, isPartial, effectiveMode);
      }
      if (pillShadow) {
        pillShadow.getElementById("wrapper")?.classList.remove("loading");
      }
      if (pillContainer) {
        pillContainer.style.display = "none";
      }
    };

    // Primary: Route through background service worker
    try {
      chrome.runtime.sendMessage(
        { action: "format_text", text: textToPolish, mode: effectiveMode },
        (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            console.warn("[OmniPolish] Background failed, trying direct localhost fallback...");
            fallbackDirectFetch(textToPolish, effectiveMode, onComplete);
            return;
          }
          onComplete(res.data?.formatted_text);
        }
      );
    } catch (e) {
      fallbackDirectFetch(textToPolish, effectiveMode, onComplete);
    }
  }

  function fallbackDirectFetch(text, mode, callback) {
    fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode })
    })
      .then((r) => r.json())
      .then((data) => callback(data.formatted_text))
      .catch((err) => {
        console.error("[OmniPolish] Both background and direct fetch failed. Is daemon running?", err);
        callback(null);
      });
  }

  // --- 6. KEYBOARD SHORTCUTS & COMMANDS ---
  window.addEventListener("keydown", (e) => {
    // 1. Esc key: dismisses pill
    if (e.key === "Escape") {
      if (pillContainer && pillContainer.style.display === "block") {
        e.preventDefault();
        dismissPill();
        return;
      }
    }

    // 2. Alt + Z: Summon / Dismiss pill on demand
    if (e.altKey && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      togglePillOnCommand();
      return;
    }

    // 3. Alt + Q: Polish Message directly
    if (e.altKey && (e.key === "q" || e.key === "Q")) {
      e.preventDefault();
      executePolish("auto");
      return;
    }

    // 4. Alt + P: Supercharge AI Prompt directly
    if (e.altKey && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      executePolish("ai_prompt");
      return;
    }
  }, true);

  // Background Messages listener (Context Menu, Chrome Commands)
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "trigger_polish") {
      executePolish(req.mode || "auto");
    } else if (req.action === "toggle_pill") {
      togglePillOnCommand();
    }
  });
})();
