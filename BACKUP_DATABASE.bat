@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\trading_journal.db" (
    echo ERROR: Database not found: backend\trading_journal.db
    pause
    exit /b 1
)
if not exist "backups" mkdir "backups"
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "STAMP=%%I"
copy /Y "backend\trading_journal.db" "backups\trading_journal_%STAMP%.db" >nul
if %errorlevel%==0 (
    echo Backup created: backups\trading_journal_%STAMP%.db
) else (
    echo ERROR: Backup failed.
)
pause
endlocal
