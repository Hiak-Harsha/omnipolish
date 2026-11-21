@echo off
title Stop OmniPolish
cd /d "%~dp0"
echo [*] Stopping all running OmniPolish background instances...
powershell -Command "Get-Process -Name python, pythonw -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'omnipolish' } | Stop-Process -Force"
echo [✓] OmniPolish stopped cleanly.
timeout /t 2 >nul
exit
