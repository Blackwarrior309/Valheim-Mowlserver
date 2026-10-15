@echo off
chcp 65001 >nul
title Valheim-Sync (Dauerbetrieb)
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js fehlt: https://nodejs.org & pause & exit /b 1)
node sync.cjs --loop
pause
