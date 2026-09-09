@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Python virtual environment not found.
    echo Run START_GENG_EDGE.bat from the project root first.
    pause
    exit /b 1
)
if not exist ".env" (
    echo .env file not found.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
endlocal
