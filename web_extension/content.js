/**
 * OmniPolish Content Script
 * Injects Floating Action Pill, Handles In-Page Hotkeys (Alt+Q, Alt+P),
 * Supports Mouse Selection, and Replaces Text in WhatsApp Web, ChatGPT, Gmail, Instagram, etc.
 */

(function () {
  const API_ENDPOINT = "http://127.0.0.1:8765/api/format";
  const isWhatsApp = window.location.hostname.includes("whatsapp.com");

  let activeElement = null;
  let pillContainer = null;
  let pillShadow = null;
  let hidePillTimeout = null;
  let showPillSetting = true;

  let savedRange = null;
  let savedSelectedText = "";

  // Load user preference for floating pill
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

  // Track mouse text selection across the page
  document.addEventListener("selectionchange", () => {
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
        positionPillNearRange(savedRange);
      }
    } else {
      savedSelectedText = "";
    }
  });

  // --- 1. SHADOW DOM FLOATING ACTION PILL ---
  function initFloatingPill() {
    if (pillContainer) return;

    pillContainer = document.createElement("div");
    pillContainer.id = "omnipolish-pill-root";
    pillContainer.style.cssText = "position: absolute; z-index: 2147483647; display: none; pointer-events: auto;";
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
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 10px rgba(56, 189, 248, 0.2);
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
      </div>
    `;

    const polishBtn = pillShadow.getElementById("polishBtn");
    const promptBtn = pillShadow.getElementById("promptBtn");

    // Handle both pointerdown and click
    const handleAction = (mode, e) => {
      e.preventDefault();
      e.stopPropagation();
      executePolish(mode);
    };

    polishBtn.addEventListener("pointerdown", (e) => handleAction("auto", e));
    polishBtn.addEventListener("click", (e) => handleAction("auto", e));

    promptBtn.addEventListener("pointerdown", (e) => handleAction("ai_prompt", e));
    promptBtn.addEventListener("click", (e) => handleAction("ai_prompt", e));
  }

  function positionPillNearElement(el) {
    if (!showPillSetting || !pillContainer) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const top = window.scrollY + rect.bottom - 36;
    const left = window.scrollX + rect.right - 145;

    pillContainer.style.top = `${Math.max(window.scrollY + 5, top)}px`;
    pillContainer.style.left = `${Math.max(window.scrollX + 5, left)}px`;
    pillContainer.style.display = "block";
  }

  function positionPillNearRange(range) {
    if (!showPillSetting || !pillContainer || !range) return;
    initFloatingPill();
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    // Position just above or below the highlighted mouse selection
    const top = window.scrollY + rect.bottom + 6;
    const left = window.scrollX + rect.left;

    pillContainer.style.top = `${Math.max(window.scrollY + 5, top)}px`;
    pillContainer.style.left = `${Math.max(window.scrollX + 5, left)}px`;
    pillContainer.style.display = "block";
    clearTimeout(hidePillTimeout);
  }

  function showPillFor(el) {
    if (!showPillSetting) return;
    initFloatingPill();
    activeElement = el;
    clearTimeout(hidePillTimeout);
    positionPillNearElement(el);
  }

  function hidePillWithDelay() {
    clearTimeout(hidePillTimeout);
    hidePillTimeout = setTimeout(() => {
      // Don't hide if user has active mouse selection
      if (!savedSelectedText && pillContainer) {
        pillContainer.style.display = "none";
      }
    }, 600);
  }

  // --- 2. DEEP TEXT RETRIEVAL & INJECTION ---
  function getFullElementText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
      return el.value;
    }
    if (el.isContentEditable) {
      return el.innerText;
    }
    return "";
  }

  function replaceElementText(el, newText, isPartialSelection = false) {
    if (!el && !isPartialSelection) return;

    // WhatsApp-specific: always enforce single asterisks so no extra star is visible
    if (isWhatsApp) {
      newText = newText.replace(/\*\*([^*]+)\*\*/g, "*$1*");
    }

    if (isPartialSelection && savedRange) {
      // Replace only the mouse-selected range
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        document.execCommand("insertText", false, newText);
      } catch (e) {
        // Fallback for partial replacement
        savedRange.deleteContents();
        savedRange.insertNode(document.createTextNode(newText));
      }
      savedSelectedText = "";
      savedRange = null;
      return;
    }

    // Replace the entire input field
    el.focus();
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
      el.select();
      document.execCommand("insertText", false, newText);
      if (el.value !== newText) {
        el.value = newText;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (el.isContentEditable) {
      // ContentEditable (WhatsApp Web, ChatGPT, Claude, Gmail)
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      
      document.execCommand("delete", false, null);
      document.execCommand("insertText", false, newText);

      // WhatsApp Web specific synthetic event to activate the green Send button
      el.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: newText
      }));
    }
  }

  // --- 3. POLISH EXECUTION ---
  async function executePolish(mode = "auto") {
    // 1. Determine if we are polishing mouse-selected text or the whole input box
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

    // Show loading spinner
    if (pillShadow) {
      pillShadow.getElementById("wrapper")?.classList.add("loading");
    }

    try {
      // Determine mode: WhatsApp Web automatically defaults to 'whatsapp' mode (single asterisk)
      let effectiveMode = mode;
      if (effectiveMode === "auto") {
        if (isWhatsApp) {
          effectiveMode = "whatsapp";
        } else {
          const stored = await chrome.storage?.sync?.get(["omnipolish_mode"]);
          effectiveMode = stored?.omnipolish_mode || "auto";
        }
      }

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToPolish, mode: effectiveMode })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.formatted_text) {
          let output = data.formatted_text;
          // Clean double asterisks if WhatsApp
          if (isWhatsApp || effectiveMode === "whatsapp") {
            output = output.replace(/\*\*([^*]+)\*\*/g, "*$1*");
          }
          replaceElementText(activeElement, output, isPartial);
        }
      }
    } catch (err) {
      console.warn("[OmniPolish] Could not connect to daemon on localhost:8765.");
    } finally {
      if (pillShadow) {
        pillShadow.getElementById("wrapper")?.classList.remove("loading");
      }
      if (pillContainer) {
        pillContainer.style.display = "none";
      }
    }
  }

  // --- 4. EVENT LISTENERS ---
  document.addEventListener("focusin", (e) => {
    const target = e.target;
    if (
      target &&
      (target.tagName === "TEXTAREA" ||
       (target.tagName === "INPUT" && target.type === "text") ||
       target.isContentEditable)
    ) {
      showPillFor(target);
    }
  }, true);

  document.addEventListener("focusout", (e) => {
    hidePillWithDelay();
  }, true);

  // Keyboard Shortcuts: Alt+Q (Polish) and Alt+P (Prompt)
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "q" || e.key === "Q")) {
      e.preventDefault();
      executePolish("auto");
    } else if (e.altKey && (e.key === "p" || e.key === "P")) {
      e.preventDefault();
      executePolish("ai_prompt");
    }
  }, true);

  // Context Menu listener
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "trigger_polish") {
      executePolish(req.mode || "auto");
    }
  });
})();
