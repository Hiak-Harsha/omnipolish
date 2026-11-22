"""Unicode text styling utilities for OmniPolish.
Converts markdown-style asterisks into real Unicode Bold characters
so that bold formatting is visible everywhere without leaving visible asterisks in sent messages.
"""

import re

def to_unicode_bold(text: str) -> str:
    """Replaces *text* or **text** with genuine Unicode Mathematical Sans-Serif Bold characters.
    Ensures ZERO asterisks remain in sent chat messages.
    """
    if not text:
        return ""

    def repl(match):
        inner = match.group(1)
        res = []
        for c in inner:
            code = ord(c)
            if 65 <= code <= 90:      # A-Z -> Mathematical Sans-Serif Bold
                res.append(chr(code - 65 + 0x1D5D4))
            elif 97 <= code <= 122:   # a-z -> Mathematical Sans-Serif Bold
                res.append(chr(code - 97 + 0x1D5EE))
            elif 48 <= code <= 57:    # 0-9 -> Mathematical Sans-Serif Bold
                res.append(chr(code - 48 + 0x1D7EC))
            else:
                res.append(c)
        return "".join(res)

    # 1. Convert double asterisks **text**
    text = re.sub(r"\*\*([^\*\n]+?)\*\*", repl, text)

    # 2. Convert single asterisks *text* (excluding whitespace-only inside)
    text = re.sub(r"(?<!\*)\*([^\*\s\n][^\*\n]*?[^\*\s\n]|\w)\*(?!\*)", repl, text)

    # 3. Convert markdown bullets like "* item" to clean bullet points "• item"
    text = re.sub(r"^\*\s+", "• ", text, flags=re.MULTILINE)
    text = re.sub(r"\n\*\s+", "\n• ", text)

    # 4. Remove any remaining stray asterisks so sent messages are 100% clean
    text = text.replace("**", "").replace("*", "")

    return text
