@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Simple starter for the Local RAG backend on Windows.
REM 1) Creates a .venv in this folder if needed
REM 2) Installs dependencies from backend/requirements.txt
REM 3) Runs the FastAPI server with uvicorn on http://localhost:8000

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

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

REM Create virtual environment if it does not exist
if not exist .venv (
    echo Creating virtual environment in .venv ...
    %PYTHON% -m venv .venv
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

REM Activate venv
call .venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo Failed to activate virtual environment.
    pause
    exit /b 1
)

echo Installing backend dependencies (this may take a minute)...
python -m pip install --upgrade pip >nul
python -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies from requirements.txt
    pause
    exit /b 1
)

echo.
echo Backend is starting on http://localhost:8000
echo Leave this window open while you use the web interface.
echo Press CTRL+C to stop the server.
echo.

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

endlocal
