@echo off
title OmniPolish - Universal AI Text Engine
cd /d "%~dp0"
echo ========================================================
echo   OmniPolish - Universal AI Text Polisher & Highlighter
echo ========================================================
echo.
echo [*] Checking virtual environment...
if not exist ".venv\Scripts\python.exe" (
    echo [!] Virtual environment not found. Please set up .venv first.
    pause
    exit /b 1
)

echo [*] Starting OmniPolish Desktop Hook and Background API...
echo [*] Alt + Q (or F8)  - Message Polisher & Highlighter (WhatsApp, Slack, Email)
echo [*] Alt + P (or F9)  - ChatGPT / Gemini Prompt Supercharger (AI Prompts)
echo [*] REST API: http://127.0.0.1:8765
echo.
".venv\Scripts\python.exe" -m omnipolish.main --all
pause
