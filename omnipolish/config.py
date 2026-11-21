import json
import os
from pathlib import Path
from typing import Any, Dict

CONFIG_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = CONFIG_DIR / "config.json"
EXAMPLE_CONFIG_PATH = CONFIG_DIR / "config.example.json"

DEFAULT_CONFIG: Dict[str, Any] = {
    "provider": "gemini",
    "api_key": "",
    "model": "gemini-flash-lite-latest",
    "ollama_url": "http://localhost:11434",
    "ollama_model": "llama3.2",
    "openai_api_base": "https://api.groq.com/openai/v1",
    "openai_model": "llama-3.3-70b-versatile",
    "hotkey": "<ctrl>+<shift>+r",
    "default_mode": "auto",
    "sound_feedback": True,
    "server_host": "127.0.0.1",
    "server_port": 8765,
}

def load_config() -> Dict[str, Any]:
    config = DEFAULT_CONFIG.copy()
    target_path = CONFIG_PATH if CONFIG_PATH.exists() else EXAMPLE_CONFIG_PATH
    if target_path.exists():
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception:
            pass
    # Environment variables override config file
    if os.getenv("GEMINI_API_KEY"):
        config["api_key"] = os.getenv("GEMINI_API_KEY")
        config["provider"] = "gemini"
    elif os.getenv("GROQ_API_KEY"):
        config["api_key"] = os.getenv("GROQ_API_KEY")
        config["provider"] = "openai_compatible"
        config["openai_api_base"] = "https://api.groq.com/openai/v1"
        config["openai_model"] = "llama-3.3-70b-versatile"
    elif os.getenv("OPENAI_API_KEY"):
        config["api_key"] = os.getenv("OPENAI_API_KEY")
        config["provider"] = "openai_compatible"
        config["openai_api_base"] = "https://api.openai.com/v1"
        config["openai_model"] = "gpt-4o-mini"
    return config

def save_config(config: Dict[str, Any]) -> None:
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
