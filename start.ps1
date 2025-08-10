# Local Home Helper - PowerShell Startup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Local Home Helper - Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking if Python is installed..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python from https://python.org" -ForegroundColor Red
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if Ollama is running
Write-Host "Checking if Ollama is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Ollama is running!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Ollama is not running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please start Ollama first:" -ForegroundColor White
    Write-Host "1. Open a new PowerShell window" -ForegroundColor White
    Write-Host "2. Run: ollama serve" -ForegroundColor White
    Write-Host "3. Keep that window open" -ForegroundColor White
    Write-Host ""
    Write-Host "Then come back and run this script again" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
try {
    pip install -r requirements.txt
    Write-Host "Dependencies installed!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Start the application
Write-Host "Starting Local Home Helper..." -ForegroundColor Yellow
Write-Host ""
Write-Host "The web interface will open at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the application" -ForegroundColor White
Write-Host ""

# Start the Flask app
python app.py

Read-Host "Press Enter to exit"
