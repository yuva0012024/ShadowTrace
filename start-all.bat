@echo off
title ShadowTrace Launcher
echo ====================================================
echo  Starting ShadowTrace Services
echo ====================================================

echo [1/3] Launching Java Analytics Microservice (Port 8080)...
start "ShadowTrace - Java Service (Port 8080)" cmd /k "cd /d %~dp0java-service && java -jar target/shadowtrace-analytics-1.0.0.jar"

echo [2/3] Launching Node.js Backend API (Port 5000)...
start "ShadowTrace - Backend (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Launching React Frontend (Port 5174)...
start "ShadowTrace - Frontend (Port 5174)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ====================================================
echo  All services launched in separate windows!
echo  Dashboard: http://localhost:5174
echo ====================================================
