# ShadowTrace Services Launcher for PowerShell
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Starting ShadowTrace Full-Stack Intelligence Grid  " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Java Analytics Service
Write-Host "[1/3] Launching Java Analytics Service (Port 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\java-service'; java -jar target\shadowtrace-analytics-1.0.0.jar"

# 2. Node.js Backend API
Write-Host "[2/3] Launching Node.js Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

Start-Sleep -Seconds 2

# 3. React Frontend
Write-Host "[3/3] Launching React Frontend (Port 5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "All services started in their own terminal windows!" -ForegroundColor Green
Write-Host "Open Dashboard: http://localhost:5174" -ForegroundColor Green
