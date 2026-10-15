@echo off
chcp 65001 >nul
title Valheim-Sync
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte die LTS-Version installieren: https://nodejs.org
  echo oder in der Eingabeaufforderung:  winget install OpenJS.NodeJS.LTS
  pause
  exit /b 1
)
node sync.cjs %*
if errorlevel 2 notepad "valheim-sync.config.json"
pause
