@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0valheim-backup.ps1" %*
echo.
pause
