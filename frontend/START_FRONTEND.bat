@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules" (
    echo node_modules not found. Run START_GENG_EDGE.bat from the project root first.
    pause
    exit /b 1
)
call npm run dev -- --host 127.0.0.1
endlocal
