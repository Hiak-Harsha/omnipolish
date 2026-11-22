"""Main Polishing Engine."""

import time
import re
from typing import Any, Dict, Optional, Tuple
from omnipolish.config import load_config
from omnipolish.core.providers import (
    BaseProvider,
    GeminiProvider,
    OpenAICompatibleProvider,
    OllamaProvider,
    RuleBasedFallbackProvider,
    get_provider
)

class PolisherEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or load_config()
        self.provider = get_provider(self.config)

    def reload_config(self) -> None:
        self.config = load_config()
        self.provider = get_provider(self.config)

    def set_provider(self, provider: BaseProvider) -> None:
        self.provider = provider

    def clean_output(self, raw_output: str, mode: str = "auto") -> str:
        """Sanitizes LLM output to remove accidental code block fences, preambles, and enforces correct bold syntax."""
        output = raw_output.strip()
        # Remove surrounding markdown code fences if model mistakenly wrapped response
        if output.startswith("```") and output.endswith("```"):
            lines = output.splitlines()
            if len(lines) >= 2:
                output = "\n".join(lines[1:-1]).strip()

        # Remove quotes if the entire text is wrapped in single or double quotes
        if (output.startswith('"') and output.endswith('"')) or (output.startswith("'") and output.endswith("'")):
            output = output[1:-1].strip()

        # Remove "Here is the corrected message:" preamble if any model hallucinated it
        preambles = [
            r"^here('s| is) (the |your )?(corrected|polished|formatted) (message|text|version):?\s*",
            r"^(output|revised|corrected):?\s*"
        ]
        for p in preambles:
            output = re.sub(p, "", output, flags=re.IGNORECASE).strip()

        # Enforce single asterisk bolding for WhatsApp and everyday chats so no extra asterisk is visible
        if mode.lower() in ("whatsapp", "chat", "dm"):
            output = re.sub(r"\*\*([^\*]+)\*\*", r"*\1*", output)
        elif mode.lower() == "auto":
            # For everyday messages, ensure single-asterisk bolding (*bold*) so WhatsApp/Slack render cleanly
            if not ("```" in output or "Role & Objective" in output or "\n# " in output):
                output = re.sub(r"\*\*([^\*]+)\*\*", r"*\1*", output)

        return output

    def format_text(self, text: str, mode: Optional[str] = None) -> Tuple[str, float, str]:
        """Formats and highlights text.
        Returns:
            Tuple of (formatted_text, latency_ms, provider_name)
        """
        if not text or not text.strip():
            return text, 0.0, "noop"

        effective_mode = mode or self.config.get("default_mode", "auto")
        start_time = time.perf_counter()
        
        try:
            raw_result = self.provider.polish(text, mode=effective_mode)
            formatted = self.clean_output(raw_result, mode=effective_mode)
            if hasattr(self.provider, "last_used_model"):
                provider_name = getattr(self.provider, "last_used_model")
            else:
                provider_name = self.provider.__class__.__name__
        except Exception as e:
            # Automatic fallback to rule-based engine on network or auth failure
            fallback = RuleBasedFallbackProvider()
            raw_result = fallback.polish(text, mode=effective_mode)
            formatted = self.clean_output(raw_result, mode=effective_mode)
            provider_name = f"RuleBasedFallback (after {e})"

        latency_ms = (time.perf_counter() - start_time) * 1000.0
        return formatted, latency_ms, provider_name
