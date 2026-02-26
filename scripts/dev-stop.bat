@echo off
REM VeraProof AI - Stop Development Services (Windows)

echo Stopping VeraProof AI services...

REM Stop Node.js processes (Partner Dashboard)
echo Stopping Partner Dashboard...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8200') do taskkill /F /PID %%a 2>nul

REM Stop Python HTTP server (Verification Interface)
echo Stopping Verification Interface...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8300') do taskkill /F /PID %%a 2>nul

REM Stop Backend (HTTPS)
echo Stopping Backend API...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8443') do taskkill /F /PID %%a 2>nul

REM Stop Docker services
echo Stopping Docker services...
docker-compose down

echo.
echo All services stopped!
pause
