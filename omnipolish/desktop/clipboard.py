"""Safe and robust clipboard and text replacement operations for Windows.
Supports both manual selection and smart auto-select-all with guaranteed deletion of the old text.
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
        user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)

def simulate_ctrl_c() -> None:
    """Sends a clean Ctrl+C key event sequence without modifier interference."""
    release_all_modifiers()
    time.sleep(0.05)
    user32.keybd_event(VK_CONTROL, 0, 0, 0)
    user32.keybd_event(VK_C, 0, 0, 0)
    time.sleep(0.04)
    user32.keybd_event(VK_C, 0, KEYEVENTF_KEYUP, 0)
    user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)

def simulate_ctrl_a() -> None:
    """Sends a clean Ctrl+A to select all text in the current input box."""
    release_all_modifiers()
    time.sleep(0.05)
    user32.keybd_event(VK_CONTROL, 0, 0, 0)
    user32.keybd_event(VK_A, 0, 0, 0)
    time.sleep(0.04)
    user32.keybd_event(VK_A, 0, KEYEVENTF_KEYUP, 0)
    user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)

def simulate_backspace() -> None:
    """Sends a Backspace to cleanly delete selected text."""
    release_all_modifiers()
    time.sleep(0.03)
    user32.keybd_event(VK_BACK, 0, 0, 0)
    time.sleep(0.03)
    user32.keybd_event(VK_BACK, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.04)

def simulate_ctrl_v() -> None:
    """Sends a clean Ctrl+V key event sequence without modifier interference."""
    release_all_modifiers()
    time.sleep(0.05)
    user32.keybd_event(VK_CONTROL, 0, 0, 0)
    user32.keybd_event(VK_V, 0, 0, 0)
    time.sleep(0.04)
    user32.keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0)
    user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.05)

def capture_text(timeout: float = 0.7) -> Tuple[str, str]:
    """Captures text from active window.
    1. First checks if the user has manually highlighted text with mouse or keyboard.
    2. If not, automatically performs Ctrl+A to select the whole active input box.
    Returns:
        Tuple of (captured_text, mode) where mode is 'manual' or 'all'.
    """
    seq_before = user32.GetClipboardSequenceNumber()
    
    # Attempt 1: Check manual selection (user highlighted with mouse or Shift+arrows)
    simulate_ctrl_c()
    start = time.time()
    while time.time() - start < timeout:
        seq_now = user32.GetClipboardSequenceNumber()
        if seq_now != seq_before:
            time.sleep(0.03)
            try:
                text = pyperclip.paste()
                if text and text.strip():
                    return text.strip(), "manual"
            except Exception:
                pass
        time.sleep(0.03)

    # Attempt 2: Auto Select-All (User has cursor inside input box without dragging mouse)
    seq_before_all = user32.GetClipboardSequenceNumber()
    simulate_ctrl_a()
    time.sleep(0.05)
    simulate_ctrl_c()

    start = time.time()
    while time.time() - start < timeout:
        seq_now = user32.GetClipboardSequenceNumber()
        if seq_now != seq_before_all:
            time.sleep(0.03)
            try:
                text = pyperclip.paste()
                if text and text.strip():
                    return text.strip(), "all"
            except Exception:
                pass
        time.sleep(0.03)

    return "", "none"

def replace_text(new_text: str, capture_mode: str = "manual") -> None:
    """Replaces the old text with the new formatted message, ensuring the old message is 100% deleted.
    - If capture_mode == 'all': Selects all text again, deletes it with Backspace, then pastes.
    - If capture_mode == 'manual': Directly pastes over the highlighted selection.
    """
    if not new_text:
        return

    pyperclip.copy(new_text)
    time.sleep(0.05)

    if capture_mode == "all":
        # Ensure everything in the active box is selected and wiped clean
        simulate_ctrl_a()
        time.sleep(0.04)
        simulate_backspace()
        time.sleep(0.04)

    # Paste the new polished text (Ctrl+V naturally overwrites selected text)
    simulate_ctrl_v()
