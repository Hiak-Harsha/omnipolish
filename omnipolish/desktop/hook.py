"""Global hotkey listener and orchestrator for OmniPolish Desktop."""

import threading
import time
import winsound
from typing import Optional
from pynput import keyboard

from omnipolish.config import load_config
from omnipolish.core.engine import PolisherEngine
from omnipolish.desktop.clipboard import capture_text, replace_text, release_all_modifiers

class DesktopHook:
    def __init__(self, engine: Optional[PolisherEngine] = None):
        self.config = load_config()
        self.engine = engine or PolisherEngine(self.config)
        self.lock = threading.Lock()
        self.hotkey_listener: Optional[keyboard.GlobalHotKeys] = None

    def play_sound(self, success: bool = True) -> None:
        if not self.config.get("sound_feedback", True):
            return
        try:
            if success:
                winsound.Beep(1200, 70)
            else:
                winsound.Beep(450, 120)
        except Exception:
            pass

    def on_hotkey_triggered(self, mode: Optional[str] = None) -> None:
        """Triggered when a hotkey is pressed."""
        if not self.lock.acquire(blocking=False):
            return

        target_mode = mode or self.config.get("default_mode", "auto")

        def worker():
            try:
                time.sleep(0.12)
                release_all_modifiers()

                selected_text, capture_mode = capture_text()
                if not selected_text or not selected_text.strip():
                    print("[OmniPolish] No text detected. Click inside a message box or highlight text first.")
                    self.play_sound(success=False)
                    return

                action_name = "AI Prompt Supercharge" if target_mode == "ai_prompt" else "Message Polish"
                print(f"[OmniPolish] [{action_name}] Captured ({capture_mode}): {selected_text[:50]}...")
                
                # Polish the text
                polished, latency, provider = self.engine.format_text(
                    selected_text,
                    mode=target_mode
                )

                if polished:
                    replace_text(polished, capture_mode=capture_mode)
                    self.play_sound(success=True)
                    print(f"[OmniPolish] Cleanly replaced in {latency:.1f}ms [{provider}]!")
                else:
                    self.play_sound(success=False)
            except Exception as e:
                print(f"[OmniPolish Error] {e}")
                self.play_sound(success=False)
            finally:
                self.lock.release()

        threading.Thread(target=worker, daemon=True).start()

    def on_message_polish(self) -> None:
        self.on_hotkey_triggered(mode=self.config.get("default_mode", "auto"))

    def on_prompt_supercharge(self) -> None:
        self.on_hotkey_triggered(mode="ai_prompt")

    def start(self) -> None:
        primary_hotkey = self.config.get("hotkey", "<ctrl>+<shift>+r")
        provider_name = self.config.get('provider', 'gemini')
        has_key = bool(self.config.get('api_key', '').strip())

        print("\n" + "=" * 65)
        print("  ✨ OmniPolish Desktop Daemon is ACTIVE")
        print("=" * 65)
        print(f"[*] 💬 Message Polisher & Highlighter:  Alt + Q  |  F8  |  {primary_hotkey}")
        print(f"    (Use in WhatsApp, Slack, Gmail, Instagram, Teams)")
        print()
        print(f"[*] 🧠 ChatGPT / Gemini Supercharger:  Alt + P  |  Ctrl + Shift + P  |  Fn + F9")
        print(f"    (Transforms rough queries into advanced, high-yield prompts)")
        print("=" * 65)
        
        if has_key:
            print(f"[*] AI Engine Status:    [✓] {provider_name.upper()} ACTIVE (Full AI Enabled)")
        else:
            print(f"[*] AI Engine Status:    [!] Basic Fallback (No API key configured)")
            print(f"    --> To activate full AI:")
            print(f"        Run: python -m omnipolish.main --settings")
            print(f"        Or paste your free key into config.json")
        
        print(f"[*] Instructions:")
        print(f"    1. Type a message or rough prompt in any app")
        print(f"    2. Press F8 to Polish Messages, or F9 to Supercharge AI Prompts")
        print("=" * 65 + "\n")

        # Register hotkeys
        hotkey_map = {
            primary_hotkey: self.on_message_polish,
            "<ctrl>+<shift>+<space>": self.on_message_polish,
            "<alt>+q": self.on_message_polish,
            "<f8>": self.on_message_polish,
            # AI Prompt Supercharger hotkeys
            "<alt>+p": self.on_prompt_supercharge,
            "<ctrl>+<shift>+p": self.on_prompt_supercharge,
            "<f9>": self.on_prompt_supercharge
        }

        with keyboard.GlobalHotKeys(hotkey_map) as listener:
            self.hotkey_listener = listener
            listener.join()

    def stop(self) -> None:
        if self.hotkey_listener:
            self.hotkey_listener.stop()
