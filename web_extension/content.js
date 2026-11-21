/**
 * OmniPolish Content Script
 * Listens for Alt+R inside web text areas, inputs, and rich editors (WhatsApp Web, Gmail, ChatGPT, etc.)
 */
(function () {
  const API_ENDPOINT = "http://127.0.0.1:8765/api/format";

  function getActiveText(element) {
    if (element.tagName === "TEXTAREA" || (element.tagName === "INPUT" && element.type === "text")) {
      return element.value;
    }
    if (element.isContentEditable) {
      return element.innerText;
    }
    return "";
  }

  function setActiveText(element, newText) {
    if (element.tagName === "TEXTAREA" || (element.tagName === "INPUT" && element.type === "text")) {
      element.value = newText;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (element.isContentEditable) {
      element.innerText = newText;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async function polishCurrentElement(element) {
    const originalText = getActiveText(element).trim();
    if (!originalText) return;

    // Visual indicator that it's working
    const originalBorder = element.style.outline;
    element.style.outline = "2px solid #38bdf8";

    try {
      const mode = (await chrome.storage?.sync?.get(["omnipolish_mode"]))?.omnipolish_mode || "auto";
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText, mode: mode })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.formatted_text) {
          setActiveText(element, data.formatted_text);
        }
      }
    } catch (err) {
      console.warn("[OmniPolish] Server unreachable. Is OmniPolish daemon running on port 8765?", err);
    } finally {
      element.style.outline = originalBorder;
    }
  }

  // Global listener for Alt+R
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "r" || e.key === "R")) {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "TEXTAREA" ||
         activeEl.tagName === "INPUT" ||
         activeEl.isContentEditable)
      ) {
        e.preventDefault();
        polishCurrentElement(activeEl);
      }
    }
  }, true);
})();
