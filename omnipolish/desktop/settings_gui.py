"""Graphical Settings Window for OmniPolish."""

import tkinter as tk
from tkinter import ttk, messagebox
from omnipolish.config import load_config, save_config
from omnipolish.core.engine import PolisherEngine

def open_settings_window():
    config = load_config()
    engine = PolisherEngine()

    root = tk.Tk()
    root.title("OmniPolish - AI Engine Settings")
    root.geometry("480x420")
    root.resizable(False, False)
    root.configure(bg="#0f172a")

    style = ttk.Style()
    style.theme_use("clam")

    # Title
    title_lbl = tk.Label(
        root, text="✨ OmniPolish Settings",
        font=("Segoe UI", 16, "bold"), fg="#38bdf8", bg="#0f172a"
    )
    title_lbl.pack(pady=(15, 5))

    sub_lbl = tk.Label(
        root, text="Connect Gemini API or local Ollama for full AI polishing",
        font=("Segoe UI", 9), fg="#94a3b8", bg="#0f172a"
    )
    sub_lbl.pack(pady=(0, 15))

    frame = tk.Frame(root, bg="#0f172a", padx=20)
    frame.pack(fill="both", expand=True)

    # Provider
    tk.Label(frame, text="AI Provider:", font=("Segoe UI", 10, "bold"), fg="#f8fafc", bg="#0f172a").grid(row=0, column=0, sticky="w", pady=6)
    provider_var = tk.StringVar(value=config.get("provider", "gemini"))
    provider_cb = ttk.Combobox(frame, textvariable=provider_var, values=["gemini", "openai_compatible", "ollama"], state="readonly", width=32)
    provider_cb.grid(row=0, column=1, sticky="w", pady=6)

    # API Key
    tk.Label(frame, text="API Key:", font=("Segoe UI", 10, "bold"), fg="#f8fafc", bg="#0f172a").grid(row=1, column=0, sticky="w", pady=6)
    api_key_var = tk.StringVar(value=config.get("api_key", ""))
    api_key_entry = tk.Entry(frame, textvariable=api_key_var, show="*", width=35, bg="#1e293b", fg="#f8fafc", insertbackground="#f8fafc")
    api_key_entry.grid(row=1, column=1, sticky="w", pady=6)

    # Free key hint
    hint_lbl = tk.Label(frame, text="(Get free key at: aistudio.google.com/app/apikey)", font=("Segoe UI", 8), fg="#38bdf8", bg="#0f172a")
    hint_lbl.grid(row=2, column=1, sticky="w", pady=(0, 8))

    # Formatting Mode
    tk.Label(frame, text="Formatting Style:", font=("Segoe UI", 10, "bold"), fg="#f8fafc", bg="#0f172a").grid(row=3, column=0, sticky="w", pady=6)
    mode_var = tk.StringVar(value=config.get("default_mode", "auto"))
    mode_cb = ttk.Combobox(frame, textvariable=mode_var, values=["auto", "whatsapp", "markdown", "plain"], state="readonly", width=32)
    mode_cb.grid(row=3, column=1, sticky="w", pady=6)

    # Quick Test Field
    tk.Label(frame, text="Test Message:", font=("Segoe UI", 10, "bold"), fg="#f8fafc", bg="#0f172a").grid(row=4, column=0, sticky="w", pady=6)
    test_entry = tk.Entry(frame, width=35, bg="#1e293b", fg="#f8fafc", insertbackground="#f8fafc")
    test_entry.insert(0, "plz send me the report by 3pm urgent")
    test_entry.grid(row=4, column=1, sticky="w", pady=6)

    result_box = tk.Text(frame, height=3, width=50, bg="#1e293b", fg="#34d399", font=("Consolas", 9), wrap="word")
    result_box.grid(row=5, column=0, columnspan=2, pady=10)

    def run_live_test():
        txt = test_entry.get().strip()
        if not txt:
            return
        temp_cfg = config.copy()
        temp_cfg["provider"] = provider_var.get()
        temp_cfg["api_key"] = api_key_var.get().strip()
        temp_cfg["default_mode"] = mode_var.get()
        engine.config = temp_cfg
        engine.reload_config()
        
        result_box.delete("1.0", tk.END)
        result_box.insert(tk.END, "Testing with provider...\n")
        root.update()

        formatted, latency, prov = engine.format_text(txt, mode=mode_var.get())
        result_box.delete("1.0", tk.END)
        result_box.insert(tk.END, f"[{prov} | {latency:.0f}ms]:\n{formatted}")

    btn_frame = tk.Frame(root, bg="#0f172a")
    btn_frame.pack(fill="x", padx=20, pady=10)

    test_btn = tk.Button(btn_frame, text="⚡ Test Engine", command=run_live_test, bg="#334155", fg="#f8fafc", relief="flat", padx=12, pady=5)
    test_btn.pack(side="left")

    def save_and_close():
        config["provider"] = provider_var.get()
        config["api_key"] = api_key_var.get().strip()
        config["default_mode"] = mode_var.get()
        save_config(config)
        messagebox.showinfo("OmniPolish", "Settings saved successfully!")
        root.destroy()

    save_btn = tk.Button(btn_frame, text="💾 Save Settings", command=save_and_close, bg="#0284c7", fg="#ffffff", relief="flat", padx=15, pady=5, font=("Segoe UI", 9, "bold"))
    save_btn.pack(side="right")

    root.mainloop()

if __name__ == "__main__":
    open_settings_window()
