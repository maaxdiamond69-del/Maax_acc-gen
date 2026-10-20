@echo off
cd /d "%~dp0"
:loop
node bot.js
if %ERRORLEVEL%==0 goto end
echo bot stopped, restarting in 5s
timeout /t 5 /nobreak >nul
goto loop
:end
