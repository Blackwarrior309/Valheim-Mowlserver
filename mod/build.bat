@echo off
chcp 65001 >nul
rem Baut den Mod und legt ein fertiges Paket in mod\paket\ValheimWeltLive an.
rem Voraussetzung: .NET SDK (https://dotnet.microsoft.com/download) und Valheim mit BepInEx.
cd /d "%~dp0"
set VALHEIM=%~1
if "%VALHEIM%"=="" set VALHEIM=C:\Program Files (x86)\Steam\steamapps\common\Valheim
echo Valheim-Ordner: %VALHEIM%
dotnet build ValheimWeltLive\ValheimWeltLive.csproj -c Release -p:ValheimDir="%VALHEIM%" || (pause & exit /b 1)
rmdir /s /q paket 2>nul
mkdir paket\ValheimWeltLive\web
copy /y ValheimWeltLive\bin\Release\ValheimWeltLive.dll paket\ValheimWeltLive\ >nul
xcopy /e /i /y ..\index.html paket\ValheimWeltLive\web\ >nul
xcopy /e /i /y ..\css paket\ValheimWeltLive\web\css >nul
xcopy /e /i /y ..\js paket\ValheimWeltLive\web\js >nul
xcopy /e /i /y ..\lib paket\ValheimWeltLive\web\lib >nul
xcopy /e /i /y ..\plans paket\ValheimWeltLive\web\plans >nul
if exist ..\textures xcopy /e /i /y ..\textures paket\ValheimWeltLive\web\textures >nul
if exist ..\assets\valheim xcopy /e /i /y ..\assets\valheim paket\ValheimWeltLive\web\assets\valheim >nul
echo.
echo Fertig: mod\paket\ValheimWeltLive  →  nach "%VALHEIM%\BepInEx\plugins\" kopieren.
if /i "%~2"=="install" xcopy /e /i /y paket\ValheimWeltLive "%VALHEIM%\BepInEx\plugins\ValheimWeltLive" >nul && echo Installiert.
pause
