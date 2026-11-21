@echo off
title OmniPolish Settings
cd /d "%~dp0"
".venv\Scripts\python.exe" -m omnipolish.main --settings
