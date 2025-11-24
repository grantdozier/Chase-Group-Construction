@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Simple starter for the Local RAG + Workflow backend on Windows.
REM Intended usage for you and your client:
REM   - Copy the ENTIRE project folder (containing the "backend" directory) to their machine.
REM   - Open the backend\ folder and double-click this start-backend.bat.
REM This script will:
REM   1) Work entirely from the backend/ folder (no assumptions about git or parent folders).
REM   2) Create backend/.venv if needed.
REM   3) Install dependencies from backend/requirements.txt into that venv.
REM   4) Run "python -m playwright install" to ensure browsers are available.
REM   5) Start the FastAPI server as main:app on http://localhost:8000.

REM Prefer py launcher if available
for %%P in (py python) do (
    where %%P >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set PYTHON=%%P
        goto :found_python
    )
)
:found_python

echo Using Python interpreter: %PYTHON%

REM Create virtual environment under backend/.venv (relative to this folder)
if not exist .venv (
    echo Creating virtual environment in .venv ...
    %PYTHON% -m venv .venv
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo Failed to activate virtual environment.
    pause
    exit /b 1
)

echo Installing backend dependencies (this may take a minute)...
python -m pip install --upgrade pip >nul
if not exist requirements.txt (
    echo Could not find requirements.txt in the backend folder.
    echo Make sure you copied the ENTIRE project folder (including backend and frontend).
    pause
    exit /b 1
)
python -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies from backend\requirements.txt
    pause
    exit /b 1
)

echo Ensuring Playwright browsers are installed (this may run only the first time)...
python -m playwright install

echo.
echo Backend is starting on http://localhost:8000
echo Leave this window open while you use the web interface.
echo Press CTRL+C to stop the server.
echo.

REM Run from within backend/, so we use main:app instead of backend.main:app
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

endlocal
