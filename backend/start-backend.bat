@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Simple starter for the Local RAG + Workflow backend on Windows.
REM Usage for your client:
REM   - Copy the ENTIRE project folder (containing "backend" and "frontend") onto their machine.
REM   - Open the backend\ folder and double-click this start-backend.bat.
REM This script will:
REM   1) Locate the repo root (parent of backend/).
REM   2) Create backend/.venv if needed.
REM   3) Reinstall backend/requirements.txt into that venv every time (keeps deps up to date).
REM   4) Run "python -m playwright install" to ensure browsers are available.
REM   5) Start the FastAPI server as backend.main:app on http://localhost:8000.

set SCRIPT_DIR=%~dp0

REM REPO_ROOT is the parent of backend/ (where the git repo root lives)
pushd "%SCRIPT_DIR%.." >nul
set REPO_ROOT=%CD%
popd >nul

cd /d "%REPO_ROOT%"

REM Detect Python launcher or python.exe
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    set PYTHON=py
) else (
    where python >nul 2>nul
    if %ERRORLEVEL%==0 (
        set PYTHON=python
    ) else (
        echo Could not find Python on this system. Please install Python 3.10+ from https://www.python.org/downloads/windows/ and try again.
        pause
        exit /b 1
    )
)

echo Using Python interpreter: %PYTHON%

REM Create virtual environment in backend/.venv if it does not exist
if not exist backend\.venv (
    echo Creating virtual environment in backend\.venv ...
    %PYTHON% -m venv backend\.venv
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

REM Activate venv
call backend\.venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo Failed to activate virtual environment.
    pause
    exit /b 1
)

echo Installing backend dependencies (this may take a minute)...
python -m pip install --upgrade pip >nul
if not exist backend\requirements.txt (
    echo Could not find backend\requirements.txt. Make sure you copied the ENTIRE project folder (including backend and frontend).
    pause
    exit /b 1
)
python -m pip install -r backend\requirements.txt
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

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

endlocal
