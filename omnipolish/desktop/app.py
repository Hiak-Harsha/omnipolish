"""Desktop Application Runner."""

import sys
from omnipolish.core.engine import PolisherEngine
from omnipolish.desktop.hook import DesktopHook

def run_desktop() -> None:
    engine = PolisherEngine()
    hook = DesktopHook(engine=engine)
    try:
        hook.start()
    except KeyboardInterrupt:
        print("\n[OmniPolish] Stopped by user.")
        sys.exit(0)

if __name__ == "__main__":
    run_desktop()
