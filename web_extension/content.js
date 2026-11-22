/**
 * OmniPolish Content Script
 * Injects Floating Action Pill, Handles In-Page Hotkeys (Alt+Q, Alt+P),
 * and Replaces Text in WhatsApp Web, ChatGPT, Gmail, Instagram, etc.
 */

(function () {
  const API_ENDPOINT = "http://127.0.0.1:8765/api/format";
  let activeElement = null;
  let pillContainer = null;
  let pillShadow = null;
  let hidePillTimeout = null;
  let showPillSetting = true;

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
        <button class="pill-btn" id="polishBtn" title="Polish & Highlight Message (Alt+Q)">
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

    polishBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (activeElement) executePolish(activeElement, "auto");
    });

    promptBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (activeElement) executePolish(activeElement, "ai_prompt");
    });
  }

  function positionPill(el) {
    if (!showPillSetting || !pillContainer) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Position at bottom-right inside or right below the input
    const top = window.scrollY + rect.bottom - 36;
    const left = window.scrollX + rect.right - 145;

    pillContainer.style.top = `${Math.max(window.scrollY + 5, top)}px`;
    pillContainer.style.left = `${Math.max(window.scrollX + 5, left)}px`;
    pillContainer.style.display = "block";
  }

  function showPillFor(el) {
    if (!showPillSetting) return;
    initFloatingPill();
    activeElement = el;
    clearTimeout(hidePillTimeout);
    positionPill(el);
  }

  function hidePillWithDelay() {
    clearTimeout(hidePillTimeout);
    hidePillTimeout = setTimeout(() => {
      if (pillContainer) pillContainer.style.display = "none";
    }, 400);
  }

  // --- 2. DEEP TEXT RETRIEVAL & INJECTION (Works with React, Lexical, DraftJS, WhatsApp Web) ---
  function getElementText(el) {
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
      return el.value;
    }
    if (el.isContentEditable) {
      return el.innerText;
    }
    return "";
  }

  function setElementText(el, newText) {
    el.focus();
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text")) {
      // Standard input/textarea
      el.select();
      document.execCommand("insertText", false, newText);
      if (el.value !== newText) {
        el.value = newText;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else if (el.isContentEditable) {
      // ContentEditable (WhatsApp Web, ChatGPT, Claude, Gmail)
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      
      document.execCommand("delete", false, null);
      document.execCommand("insertText", false, newText);

      // Fallback if execCommand was prevented
      if (el.innerText.trim() !== newText.trim()) {
        el.innerText = newText;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  // --- 3. POLISH EXECUTION ---
  async function executePolish(el, mode = "auto") {
    const originalText = getElementText(el).trim();
    if (!originalText) return;

    // Show loading spinner on pill
    if (pillShadow) {
      pillShadow.getElementById("wrapper")?.classList.add("loading");
    }

    try {
      // Check stored custom mode if mode is 'auto'
      let effectiveMode = mode;
      if (mode === "auto") {
        const stored = await chrome.storage?.sync?.get(["omnipolish_mode"]);
        effectiveMode = stored?.omnipolish_mode || "auto";
      }

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText, mode: effectiveMode })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.formatted_text) {
          setElementText(el, data.formatted_text);
        }
      } else {
        console.warn("[OmniPolish] Server returned status:", res.status);
      }
    } catch (err) {
      console.warn("[OmniPolish] Could not connect to daemon on localhost:8765. Make sure start_tray.vbs is running.");
    } finally {
      if (pillShadow) {
        pillShadow.getElementById("wrapper")?.classList.remove("loading");
      }
    }
  }

  // --- 4. EVENT LISTENERS ---
  // Input focus & blur
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
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) {
        e.preventDefault();
        executePolish(el, "auto");
      }
    } else if (e.altKey && (e.key === "p" || e.key === "P")) {
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) {
        e.preventDefault();
        executePolish(el, "ai_prompt");
      }
    }
  }, true);

  // Listen for Context Menu messages from background.js
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "trigger_polish") {
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) {
        executePolish(el, req.mode || "auto");
      } else if (req.selectedText) {
        // Read-only text selected: polish and copy to clipboard
        fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: req.selectedText, mode: req.mode || "auto" })
        })
        .then(r => r.json())
        .then(d => {
          if (d.formatted_text) {
            navigator.clipboard.writeText(d.formatted_text);
            alert("✨ Polished text copied to clipboard!");
          }
        })
        .catch(() => alert("Could not reach OmniPolish daemon."));
      }
    }
  });
})();
