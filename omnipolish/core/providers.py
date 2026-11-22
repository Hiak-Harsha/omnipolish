"""AI Provider implementations for OmniPolish."""

from abc import ABC, abstractmethod
import json
import re
from typing import Any, Dict, Optional
import requests
from omnipolish.core.prompt import build_system_prompt

class BaseProvider(ABC):
    @abstractmethod
    def polish(self, text: str, mode: str = "auto") -> str:
        """Process text and return polished version."""
        pass

class GeminiProvider(BaseProvider):
    """Google Gemini & Gemma Multi-SLM Provider with task-specialized routing."""
    # Fast SLMs for everyday chat/messaging (<1500ms) - tested and 100% active on user key
    FAST_SLMS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
    # Deeper reasoning models for advanced AI prompt architecture
    REASONING_SLMS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]

    def __init__(self, api_key: str, model: str = "gemini-flash-lite-latest"):
        self.api_key = api_key
        self.default_model = model
        self.last_used_model = model

    def polish(self, text: str, mode: str = "auto") -> str:
        system_instruction = build_system_prompt(mode)
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": text}]
                }
            ],
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": 0.2 if mode == "ai_prompt" else 0.3,
                "maxOutputTokens": 2048,
            }
        }
        
        # Select optimal multi-SLM sequence based on task complexity
        if mode in ("ai_prompt", "prompt", "chatgpt_expert", "optimize"):
            models_to_try = self.REASONING_SLMS
        else:
            models_to_try = [self.default_model] + [m for m in self.FAST_SLMS if m != self.default_model]

        last_error = ""

        for model_name in models_to_try:
            endpoint = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                f"?key={self.api_key}"
            )
            try:
                response = requests.post(
                    endpoint,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            self.last_used_model = model_name
                            return parts[0].get("text", "").strip()
                else:
                    last_error = f"{model_name} error ({response.status_code}): {response.text[:150]}"
            except Exception as e:
                last_error = f"{model_name} exception: {e}"

        raise RuntimeError(f"All SLM models failed. Last error: {last_error}")

class OpenAICompatibleProvider(BaseProvider):
    """OpenAI compatible provider (Groq, Together, OpenAI, DeepSeek, etc.)."""
    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    def polish(self, text: str, mode: str = "auto") -> str:
        system_prompt = build_system_prompt(mode)
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            "temperature": 0.3
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code != 200:
            raise RuntimeError(f"API error ({response.status_code}): {response.text}")
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()

class OllamaProvider(BaseProvider):
    """Local offline Ollama provider."""
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def polish(self, text: str, mode: str = "auto") -> str:
        system_prompt = build_system_prompt(mode)
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "system": system_prompt,
            "prompt": text,
            "stream": False,
            "options": {"temperature": 0.3}
        }
        response = requests.post(url, json=payload, timeout=20)
        if response.status_code != 200:
            raise RuntimeError(f"Ollama error ({response.status_code}): {response.text}")
        data = response.json()
        return data.get("response", "").strip()

class RuleBasedFallbackProvider(BaseProvider):
    """Offline heuristic fallback when no LLM API is reachable.
    Provides fundamental capitalization, typo correction, and key formatting.
    """
    COMMON_TYPOS = {
        r"\bi\b": "I",
        r"\bteh\b": "the",
        r"\brecieve\b": "receive",
        r"\bseperate\b": "separate",
        r"\boccured\b": "occurred",
        r"\buntill\b": "until",
        r"\bwont\b": "won't",
        r"\bcant\b": "can't",
        r"\bdont\b": "don't",
        r"\bim\b": "I'm",
        r"\bive\b": "I've",
        r"\bwhats\b": "what's",
        r"\bplz\b": "please",
        r"\bpls\b": "please",
        r"\bthx\b": "thanks",
        r"\br\b": "are",
        r"\bu\b": "you",
        r"\bur\b": "your",
    }

    def polish(self, text: str, mode: str = "auto") -> str:
        result = text.strip()
        if not result:
            return result

        # Apply common typo corrections
        for pattern, replacement in self.COMMON_TYPOS.items():
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

        # Capitalize sentence starts
        sentences = re.split(r"([.!?]\s+)", result)
        capitalized = []
        for piece in sentences:
            if piece and not re.match(r"^[.!?]\s+$", piece):
                piece = piece[0].upper() + piece[1:] if len(piece) > 1 else piece.upper()
            capitalized.append(piece)
        result = "".join(capitalized)

        # Highlight important elements like dates, deadlines, phone numbers
        # e.g., times like 5pm, dates like Nov 21, or urgent keywords
        urgent_keywords = ["urgent", "deadline", "asap", "important", "meeting", "reminder"]
        bold_wrap = "*" if mode == "whatsapp" else "**"
        for kw in urgent_keywords:
            pattern = re.compile(rf"\b({kw})\b", re.IGNORECASE)
            result = pattern.sub(rf"{bold_wrap}\1{bold_wrap}", result)

        return result

def get_provider(config: Dict[str, Any]) -> BaseProvider:
    provider_type = config.get("provider", "gemini").lower()
    api_key = config.get("api_key", "").strip()

    if provider_type == "gemini" and api_key:
        return GeminiProvider(api_key=api_key, model=config.get("model", "gemini-2.0-flash"))
    elif provider_type == "openai_compatible" and api_key:
        return OpenAICompatibleProvider(
            api_key=api_key,
            base_url=config.get("openai_api_base", "https://api.groq.com/openai/v1"),
            model=config.get("openai_model", "llama-3.3-70b-versatile")
        )
    elif provider_type == "ollama":
        return OllamaProvider(
            base_url=config.get("ollama_url", "http://localhost:11434"),
            model=config.get("ollama_model", "llama3.2")
        )
    
    # If no valid API key is supplied, return RuleBasedFallbackProvider
    return RuleBasedFallbackProvider()
