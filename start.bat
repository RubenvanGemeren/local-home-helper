@echo off
echo ========================================
echo Local Home Helper - Startup Script
echo ========================================
echo.

echo Checking if Python is installed...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python found!
echo.

echo Checking if Ollama is running...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo WARNING: Ollama is not running
    echo.
    echo Please start Ollama first:
    echo 1. Open a new PowerShell window
    echo 2. Run: ollama serve
    echo 3. Keep that window open
    echo.
    echo Then come back and run this script again
    echo.
    pause
    exit /b 1
)

echo Ollama is running!
echo.

echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo Dependencies installed!
echo.

echo Starting Local Home Helper...
echo.
echo The web interface will open at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the application
echo.

python app.py

pause
