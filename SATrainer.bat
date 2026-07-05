@echo off
REM SATrainer - double-click launcher for Windows.
REM Serves the app over http://127.0.0.1 (so saved progress works in any browser)
REM and opens your default browser. Close this window to stop.

setlocal
cd /d "%~dp0"
set "PORT=8765"
set "URL=http://127.0.0.1:%PORT%/index.html"

REM Find a Python 3 launcher (prefer the "py" launcher, then "python").
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY (where python >nul 2>nul && set "PY=python")

if not defined PY (
  echo Python 3 was not found on this PC.
  echo Opening the app directly in your browser instead.
  echo If your progress does not save, install Python 3 from
  echo    https://www.python.org/downloads/  and run this file again.
  echo.
  start "" "index.html"
  pause
  exit /b
)

echo ============================================
echo   SATrainer is starting at:
echo   %URL%
echo ============================================
echo.
echo Your browser will open in a moment.
echo Press any key in THIS window to stop the app and exit.
echo.

REM Run the local server minimized in its own window, then open the browser.
start "SATrainer server" /min %PY% -m http.server %PORT% --bind 127.0.0.1
timeout /t 2 >nul
start "" "%URL%"

pause >nul
echo Stopping SATrainer...
taskkill /fi "WINDOWTITLE eq SATrainer server*" /f >nul 2>nul
exit /b
