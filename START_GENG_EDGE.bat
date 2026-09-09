@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "PYTHON_EXE=%BACKEND%\.venv\Scripts\python.exe"

if not exist "%BACKEND%\requirements.txt" (
    echo ERROR: backend\requirements.txt was not found.
    pause
    exit /b 1
)
if not exist "%FRONTEND%\package.json" (
    echo ERROR: frontend\package.json was not found.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js/npm was not found.
    echo Install Node.js LTS, then run this file again.
    pause
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo Creating Python 3.13 virtual environment...
    where py >nul 2>nul
    if not errorlevel 1 (
        py -3.13 -m venv "%BACKEND%\.venv"
    ) else if exist "C:\Program Files\Python313\python.exe" (
        "C:\Program Files\Python313\python.exe" -m venv "%BACKEND%\.venv"
    ) else (
        echo ERROR: Python 3.13 was not found.
        echo This project should use Python 3.13.
        pause
        exit /b 1
    )
    if errorlevel 1 (
        echo ERROR: Could not create the Python 3.13 virtual environment.
        pause
        exit /b 1
    )
)

if not exist "%BACKEND%\.env" (
    if exist "%BACKEND%\.env.example" (
        copy /Y "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    ) else (
        echo ERROR: backend\.env.example was not found.
        pause
        exit /b 1
    )
)

rem Ensure the local database is SQLite.
findstr /B /C:"DATABASE_URL=sqlite:///./trading_journal.db" "%BACKEND%\.env" >nul 2>nul
if errorlevel 1 (
    echo Updating backend\.env for local SQLite...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%BACKEND%\.env'; $t=Get-Content -Raw $p; $t=[regex]::Replace($t,'(?m)^DATABASE_URL=.*$','DATABASE_URL=sqlite:///./trading_journal.db'); Set-Content -NoNewline -Encoding UTF8 $p $t"
)

if not exist "%BACKEND%\.deps-installed" (
    echo Installing backend dependencies. First run only...
    "%PYTHON_EXE%" -m pip install -r "%BACKEND%\requirements.txt"
    if errorlevel 1 (
        echo ERROR: Backend dependency installation failed.
        pause
        exit /b 1
    )
    type nul > "%BACKEND%\.deps-installed"
)

if not exist "%FRONTEND%\node_modules" (
    echo Installing frontend dependencies. First run only...
    pushd "%FRONTEND%"
    call npm install
    if errorlevel 1 (
        popd
        echo ERROR: Frontend dependency installation failed.
        pause
        exit /b 1
    )
    popd
)

if not exist "%BACKEND%\uploads" mkdir "%BACKEND%\uploads" >nul 2>nul
if not exist "%ROOT%backups" mkdir "%ROOT%backups" >nul 2>nul

echo.
echo ========================================
echo          GenG Edge - Local Start
echo ========================================
echo Backend : http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5173
echo Database: SQLite (local)
echo ========================================
echo.

start "GenG Edge Backend" cmd /k cd /d "%BACKEND%" ^&^& "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo Waiting for backend...
set "READY="
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/docs' -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 (
        set "READY=1"
        goto backend_ready
    )
    timeout /t 1 /nobreak >nul
)

if not defined READY (
    echo ERROR: Backend did not become ready.
    echo Check the GenG Edge Backend window for the error.
    pause
    exit /b 1
)

:backend_ready
start "GenG Edge Frontend" cmd /k cd /d "%FRONTEND%" ^&^& npm run dev -- --host 127.0.0.1

echo Waiting for frontend...
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 goto frontend_ready
    timeout /t 1 /nobreak >nul
)

echo WARNING: Frontend did not respond within 30 seconds.
echo You can still check the GenG Edge Frontend window.

:frontend_ready
start "" http://127.0.0.1:5173

echo.
echo GenG Edge is running.
echo Keep the Backend and Frontend windows open while using the app.
echo Close those two windows to stop GenG Edge.
echo.
endlocal
exit /b 0
