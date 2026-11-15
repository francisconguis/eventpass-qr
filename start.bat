@echo off
setlocal enabledelayedexpansion
title Event Pass System Launcher

echo ========================================================
echo       Event Pass & QR Check-in System Launcher
echo ========================================================
echo.

cd /d "%~dp0"

echo [Step 1/4] Detecting Python installation...

:: Try py launcher first, then python
set "PY_CMD="

py -3 --version >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set "PY_CMD=py -3"
    goto :FoundPython
)

python --version >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    :: Verify it is not the empty WindowsApps alias
    python -c "import sys; print(sys.version)" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set "PY_CMD=python"
        goto :FoundPython
    )
)

:: Check common default installation paths
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "C:\Program Files\Python312\python.exe"
    "C:\Program Files\Python311\python.exe"
    "C:\Program Files\Python310\python.exe"
) do (
    if exist "%%~P" (
        set "PY_CMD="%%~P""
        goto :FoundPython
    )
)

:: If we reached here, Python was not found
echo.
echo ========================================================
echo [ERROR] Python is NOT installed or not in your PATH!
echo ========================================================
echo.
echo To fix this:
echo 1. Download Python from: https://www.python.org/downloads/
echo 2. Run the installer.
echo 3. IMPORTANT: Check the box "Add python.exe to PATH" at the bottom!
echo 4. Finish the installation, then double-click start.bat again.
echo.
pause
exit /b 1

:FoundPython
echo [SUCCESS] Found Python: !PY_CMD!
!PY_CMD! --version
echo.

echo [Step 2/4] Installing / Verifying required packages...
echo (Flask, qrcode, pillow, python-dotenv)
!PY_CMD! -m pip install -r requirements.txt
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo [WARNING] Pip install encountered an issue. Trying with --user flag...
    !PY_CMD! -m pip install -r requirements.txt --user
)
echo.

echo [Step 3/4] Initializing database and directories...
if not exist "static\qrcodes" mkdir "static\qrcodes"
if not exist "sent_emails" mkdir "sent_emails"
echo [SUCCESS] Folders ready.
echo.

echo [Step 4/4] Starting the Event Application Server...
echo --------------------------------------------------------
echo  - Registration Form:  http://127.0.0.1:5000/
echo  - Check-in Scanner:   http://127.0.0.1:5000/scanner
echo  - Live Dashboard:     http://127.0.0.1:5000/dashboard
echo --------------------------------------------------------
echo Press Ctrl+C in this terminal window anytime to stop.
echo.

:: Launch browser in background after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5000"

!PY_CMD! app.py

echo.
echo Server has stopped.
pause
