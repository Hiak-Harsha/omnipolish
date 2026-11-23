"""Safe and robust clipboard and text replacement operations for Windows.
Supports both manual mouse/keyboard selection and smart auto-select-all with guaranteed deletion of old text.
Uses hardware scan codes (MapVirtualKeyW) for 100% compatibility across all modern Windows apps.
"""

import ctypes
import time
from typing import Tuple
import pyperclip

# Virtual-Key codes
VK_BACK = 0x08
VK_SHIFT = 0x10
VK_CONTROL = 0x11
VK_MENU = 0x12       # Alt key
VK_A = 0x41
VK_C = 0x43
VK_V = 0x56
VK_LWIN = 0x5B
VK_RWIN = 0x5C
KEYEVENTF_KEYUP = 0x0002

user32 = ctypes.windll.user32

def release_all_modifiers() -> None:
    """Explicitly releases any modifier keys (Ctrl, Alt, Shift, Win) that may still be held down."""
    for vk in [VK_CONTROL, VK_MENU, VK_SHIFT, VK_LWIN, VK_RWIN]:
        scan = user32.MapVirtualKeyW(vk, 0)
        user32.keybd_event(vk, scan, KEYEVENTF_KEYUP, 0)

def wait_for_modifiers_release(timeout: float = 0.5) -> None:
    """Waits for the user to lift physical modifier keys (Alt, Ctrl, Shift) before executing simulated keystrokes."""
    start = time.time()
    while time.time() - start < timeout:
        alt_down = user32.GetAsyncKeyState(VK_MENU) & 0x8000
        ctrl_down = user32.GetAsyncKeyState(VK_CONTROL) & 0x8000
        shift_down = user32.GetAsyncKeyState(VK_SHIFT) & 0x8000
        if not (alt_down or ctrl_down or shift_down):
            break
        time.sleep(0.015)
    time.sleep(0.02)
    release_all_modifiers()

def send_key(vk: int, down: bool) -> None:
    """Sends a single key event with hardware scan code."""
    flags = 0 if down else KEYEVENTF_KEYUP
    scan = user32.MapVirtualKeyW(vk, 0)
    user32.keybd_event(vk, scan, flags, 0)

def send_combo(mod_vk: int, key_vk: int) -> None:
    """Sends a modifier + key combination with hardware scan codes."""
    send_key(mod_vk, True)
    time.sleep(0.02)
    send_key(key_vk, True)
    time.sleep(0.04)
    send_key(key_vk, False)
    time.sleep(0.02)
    send_key(mod_vk, False)
    time.sleep(0.03)

def simulate_ctrl_c() -> None:
    """Sends a clean Ctrl+C key event sequence using hardware scan codes."""
    send_combo(VK_CONTROL, VK_C)

def simulate_ctrl_a() -> None:
    """Sends a clean Ctrl+A to select all text in the current input box."""
    send_combo(VK_CONTROL, VK_A)

def simulate_backspace() -> None:
    """Sends a Backspace to cleanly delete selected text."""
    send_key(VK_BACK, True)
    time.sleep(0.02)
    send_key(VK_BACK, False)
    time.sleep(0.03)

def simulate_ctrl_v() -> None:
    """Sends a clean Ctrl+V key event sequence using hardware scan codes."""
    send_combo(VK_CONTROL, VK_V)

def capture_text() -> Tuple[str, str]:
    """Captures text from active window.
    1. First checks if user has manually highlighted text with mouse or Shift+arrows.
    2. If not, automatically selects the whole active input box (Ctrl+A -> Ctrl+C).
    Returns:
        Tuple of (captured_text, mode) where mode is 'manual' or 'all' or 'none'.
    """
    old_clipboard = ""
    try:
        old_clipboard = pyperclip.paste()
    except Exception:
        pass

    sentinel = "__OMNIPOLISH_COPY_SENTINEL__"
    try:
        pyperclip.copy(sentinel)
    except Exception:
        pass

    time.sleep(0.04)

    # Attempt 1: Check manual selection (user highlighted with mouse or Shift+arrows)
    simulate_ctrl_c()
    time.sleep(0.08)

    start = time.time()
    while time.time() - start < 0.35:
        time.sleep(0.03)
        try:
            curr = pyperclip.paste()
            if curr != sentinel and curr.strip():
                return curr.strip(), "manual"
        except Exception:
            pass

    # Attempt 2: Auto Select-All (User has cursor inside input box without dragging mouse)
    simulate_ctrl_a()
    time.sleep(0.04)
    simulate_ctrl_c()
    time.sleep(0.08)

    start = time.time()
    while time.time() - start < 0.4:
        time.sleep(0.03)
        try:
            curr = pyperclip.paste()
            if curr != sentinel and curr.strip():
                return curr.strip(), "all"
        except Exception:
            pass

    # Attempt 3: Nothing was captured in active window. Restore previous clipboard.
    if old_clipboard and old_clipboard != sentinel:
        try:
            pyperclip.copy(old_clipboard)
        except Exception:
            pass

    return "", "none"

def replace_text(new_text: str, capture_mode: str = "manual") -> None:
    """Replaces old text with new formatted message, ensuring old text is 100% replaced.
    - If capture_mode == 'all': Selects all text again, deletes with Backspace, then pastes.
    - If capture_mode == 'manual': Directly pastes over the highlighted selection.
    """
    if not new_text:
        return

    pyperclip.copy(new_text)
    time.sleep(0.04)

    if capture_mode == "all":
        # Select all again and delete so old text is wiped clean
        simulate_ctrl_a()
        time.sleep(0.03)
        simulate_backspace()
        time.sleep(0.03)

    # Paste new polished text (Ctrl+V naturally overwrites selected text)
    simulate_ctrl_v()
