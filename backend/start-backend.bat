@echo off
REM ---------------------------------------------------------------------------
REM  Simple backend starter for Windows (client-friendly)
REM ---------------------------------------------------------------------------
REM Usage:
REM   - Copy the ENTIRE project folder to the machine.
REM   - Open the backend\ folder and double-click start-backend.bat.
REM Requirements on the machine:
REM   - Python 3 installed with the "py" launcher on PATH.
REM This script:
REM   - Works entirely from the backend/ folder (no venv).
REM   - Installs backend/requirements.txt into the user site-packages.
REM   - Installs Playwright browsers.
REM   - Starts uvicorn main:app on http://localhost:8000
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

where py >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Could not find the Python launcher "py" on this system.
    echo Please install Python 3 from python.org and make sure the "py" launcher is on your PATH.
    echo.
    pause
    exit /b 1
)

echo Using Python launcher: py

if not exist requirements.txt (
    echo.
    echo ERROR: Could not find requirements.txt in the backend folder.
    echo Make sure you copied the ENTIRE project folder (including the backend directory).
    echo.
    pause
    exit /b 1
)

echo.
echo Installing backend dependencies to your user Python environment (this may take a few minutes)...
py -m pip install --user --upgrade pip
py -m pip install --user -r requirements.txt
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies from requirements.txt
    echo.
    pause
    exit /b 1
)

echo.
echo Ensuring Playwright browsers are installed (this may run only the first time)...
py -m playwright install

echo.
echo Backend is starting on http://localhost:8000
echo Leave this window open while you use the web interface.
echo Press CTRL+C to stop the server.
echo.

py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo Backend process has exited. Press any key to close this window.
pause
