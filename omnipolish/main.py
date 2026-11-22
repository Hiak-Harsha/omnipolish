"""Unified Entry Point for OmniPolish."""

import argparse
import sys
import threading
from omnipolish.config import load_config
from omnipolish.core.engine import PolisherEngine
from omnipolish.desktop.hook import DesktopHook
from omnipolish.server.api import start_server

def main():
    parser = argparse.ArgumentParser(description="OmniPolish: Universal AI Text Autocorrector & Highlighter")
    parser.add_argument("--desktop", action="store_true", help="Run the system-wide desktop hotkey daemon")
    parser.add_argument("--server", action="store_true", help="Run the local REST API server for extensions & mobile")
    parser.add_argument("--all", action="store_true", help="Run both desktop daemon and local API server")
    parser.add_argument("--tray", action="store_true", help="Run silently in the Windows system tray (zero console window)")
    parser.add_argument("--test", type=str, help="Quick test formatting on a text string")
    parser.add_argument("--mode", type=str, default="auto", choices=["auto", "whatsapp", "markdown", "plain", "ai_prompt", "prompt"], help="Formatting mode for --test")
    parser.add_argument("--set-key", type=str, help="Quickly set and save your Gemini API key")
    parser.add_argument("--settings", action="store_true", help="Open visual settings window")
    
    args = parser.parse_args()
    config = load_config()

    if args.set_key:
        config["api_key"] = args.set_key.strip()
        config["provider"] = "gemini"
        save_config(config)
        print(f"[✓] Gemini API Key saved successfully in config.json! Provider set to 'gemini'.")
        return

    if args.settings:
        from omnipolish.desktop.settings_gui import open_settings_window
        open_settings_window()
        return

    # If no arguments provided, default to --all
    if not (args.desktop or args.server or args.all or args.tray or args.test):
        args.all = True

    if args.tray:
        # Start server in background daemon thread
        server_thread = threading.Thread(
            target=start_server,
            kwargs={"host": config.get("server_host", "127.0.0.1"), "port": config.get("server_port", 8765)},
            daemon=True
        )
        server_thread.start()

        # Start desktop hook in background daemon thread
        engine = PolisherEngine(config)
        desktop_hook = DesktopHook(engine=engine)
        hook_thread = threading.Thread(target=desktop_hook.start, daemon=True)
        hook_thread.start()

        # Run system tray app on main thread
        from omnipolish.desktop.tray import SystemTrayApp
        tray_app = SystemTrayApp(hook=desktop_hook, engine=engine)
        tray_app.run()
        return

    if args.test:
        engine = PolisherEngine()
        print(f"\n[Original]:\n{args.test}\n")
        formatted, latency, provider = engine.format_text(args.test, mode=args.mode)
        print(f"[Polished by {provider} in {latency:.1f}ms]:\n{formatted}\n")
        return

    if args.all:
        # Start server in background thread, desktop hook in main thread
        server_thread = threading.Thread(
            target=start_server,
            kwargs={"host": config.get("server_host", "127.0.0.1"), "port": config.get("server_port", 8765)},
            daemon=True
        )
        server_thread.start()
        
        desktop_hook = DesktopHook()
        try:
            desktop_hook.start()
        except KeyboardInterrupt:
            print("\n[OmniPolish] Shutting down.")
            sys.exit(0)

    elif args.server:
        start_server(
            host=config.get("server_host", "127.0.0.1"),
            port=config.get("server_port", 8765)
        )

    elif args.desktop:
        desktop_hook = DesktopHook()
        try:
            desktop_hook.start()
        except KeyboardInterrupt:
            print("\n[OmniPolish] Shutting down.")
            sys.exit(0)

if __name__ == "__main__":
    main()
