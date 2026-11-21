"""System Tray Daemon for OmniPolish using pystray.
Allows OmniPolish to run silently in the background with zero console window.
"""

import os
import subprocess
import sys
import threading
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as item, Menu

from omnipolish.config import load_config, save_config
from omnipolish.core.engine import PolisherEngine
from omnipolish.desktop.hook import DesktopHook

def create_tray_icon_image(paused: bool = False) -> Image.Image:
    """Generates a dynamic 64x64 tray icon."""
    img = Image.new("RGBA", (64, 64), color=(0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    # Outer circle border
    border_color = (239, 68, 68) if paused else (56, 189, 248)  # Red if paused, Cyan if active
    fill_color = (30, 41, 59)
    d.ellipse((4, 4, 60, 60), fill=fill_color, outline=border_color, width=4)
    
    # Center spark / star emblem
    star_color = (148, 163, 184) if paused else (56, 189, 248)
    d.polygon(
        [(32, 14), (36, 27), (49, 32), (36, 37), (32, 50), (28, 37), (15, 32), (28, 27)],
        fill=star_color
    )
    return img

def get_startup_file_path() -> Path:
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup" / "OmniPolish.vbs"
    return Path()

def is_autostart_enabled() -> bool:
    p = get_startup_file_path()
    return p.exists() if str(p) else False

def toggle_autostart(icon, item) -> None:
    p = get_startup_file_path()
    if not str(p):
        return
    if p.exists():
        try:
            p.unlink()
        except Exception:
            pass
    else:
        try:
            project_dir = Path(__file__).resolve().parent.parent.parent
            vbs_script = project_dir / "start_tray.vbs"
            content = f'Set WshShell = CreateObject("WScript.Shell")\nWshShell.CurrentDirectory = "{project_dir}"\nWshShell.Run """{vbs_script}""", 0, False\n'
            p.write_text(content, encoding="utf-8")
        except Exception:
            pass

class SystemTrayApp:
    def __init__(self, hook: DesktopHook, engine: PolisherEngine):
        self.hook = hook
        self.engine = engine
        self.config = load_config()
        self.icon: Optional[pystray.Icon] = None
        self.is_paused = False

    def toggle_pause(self, icon, item):
        self.is_paused = not self.is_paused
        self.hook.is_paused = self.is_paused
        # Update tray icon image (cyan for active, red for paused)
        icon.icon = create_tray_icon_image(paused=self.is_paused)
        status_text = "PAUSED" if self.is_paused else "ACTIVE"
        icon.title = f"OmniPolish ({status_text})"

    def set_mode(self, mode_name: str):
        def inner(icon, item):
            self.config["default_mode"] = mode_name
            save_config(self.config)
            self.engine.reload_config()
        return inner

    def is_mode_selected(self, mode_name: str):
        def inner(item):
            return self.config.get("default_mode", "auto") == mode_name
        return inner

    def open_settings(self, icon, item):
        def _launch():
            from omnipolish.desktop.settings_gui import open_settings_window
            open_settings_window()
            # Reload config when settings window closes
            self.config = load_config()
            self.engine.reload_config()
        threading.Thread(target=_launch, daemon=True).start()

    def open_extension_folder(self, icon, item):
        ext_path = Path(__file__).resolve().parent.parent.parent / "web_extension"
        if ext_path.exists():
            os.startfile(str(ext_path))

    def quit_app(self, icon, item):
        icon.stop()
        self.hook.stop()
        os._exit(0)

    def build_menu(self) -> Menu:
        provider_name = self.config.get("provider", "gemini").upper()
        
        mode_menu = Menu(
            item("Auto-detect", self.set_mode("auto"), checked=self.is_mode_selected("auto"), radio=True),
            item("WhatsApp (*bold*)", self.set_mode("whatsapp"), checked=self.is_mode_selected("whatsapp"), radio=True),
            item("Markdown (**bold**)", self.set_mode("markdown"), checked=self.is_mode_selected("markdown"), radio=True),
            item("Plain Text (Bullets)", self.set_mode("plain"), checked=self.is_mode_selected("plain"), radio=True),
        )

        return Menu(
            item(f"✨ OmniPolish ({provider_name})", None, enabled=False),
            item(lambda text: "▶ Resume Hotkeys" if self.is_paused else "⏸ Pause Hotkeys", self.toggle_pause),
            item("💬 Message Formatting Style", mode_menu),
            Menu.SEPARATOR,
            item("🚀 Run on Windows Startup", toggle_autostart, checked=lambda item: is_autostart_enabled()),
            item("⚙️ Settings...", self.open_settings),
            item("🌐 Web Extension Folder...", self.open_extension_folder),
            Menu.SEPARATOR,
            item("❌ Exit OmniPolish", self.quit_app)
        )

    def run(self):
        self.icon = pystray.Icon(
            name="omnipolish",
            icon=create_tray_icon_image(paused=False),
            title="OmniPolish (Active)\nAlt+Q: Polish Message\nAlt+P: Supercharge Prompt",
            menu=self.build_menu()
        )
        self.icon.run()
