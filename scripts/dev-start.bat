@echo off
REM VeraProof AI - Unified Development Environment Startup Script (Windows)
REM Starts all services required for local development with HTTPS support

setlocal enabledelayedexpansion

echo.
echo ========================================
echo VeraProof AI - Development Environment
echo ========================================
echo.

REM Load port configuration from .env.ports
if exist .env.ports (
    for /f "tokens=1,2 delims==" %%a in (.env.ports) do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            set "%%a=%%b"
        )
    )
)

REM Set default ports if not loaded
if not defined BACKEND_HTTP_PORT set BACKEND_HTTP_PORT=8100
if not defined BACKEND_HTTPS_PORT set BACKEND_HTTPS_PORT=8443
if not defined PARTNER_DASHBOARD_PORT set PARTNER_DASHBOARD_PORT=8200
if not defined VERIFICATION_INTERFACE_PORT set VERIFICATION_INTERFACE_PORT=8300
if not defined POSTGRES_PORT set POSTGRES_PORT=5432
if not defined LOCALSTACK_PORT set LOCALSTACK_PORT=4566

echo Checking prerequisites...
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found. Please install Docker Desktop.
    pause
    exit /b 1
)
echo [OK] Docker found

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose not found.
    pause
    exit /b 1
)
echo [OK] Docker Compose found

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js.
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python.
    pause
    exit /b 1
)
echo [OK] Python found

echo.
echo All prerequisites met!
echo.

REM Create logs directory
if not exist logs mkdir logs

REM Start Docker services
echo Starting Docker services (PostgreSQL, LocalStack)...
docker-compose up -d postgres localstack
if errorlevel 1 (
    echo [ERROR] Failed to start Docker services
    pause
    exit /b 1
)
echo [OK] Docker services started
echo     - PostgreSQL: localhost:%POSTGRES_PORT%
echo     - LocalStack: localhost:%LOCALSTACK_PORT%
echo.

REM Wait for services
echo Waiting for services to be ready...
timeout /t 5 /nobreak >nul
echo.

REM Start Backend API
echo Starting Backend API (HTTPS on port %BACKEND_HTTPS_PORT%)...
cd backend

REM Generate SSL certificate if needed
if not exist cert.pem (
    echo Generating self-signed SSL certificate...
    python ..\scripts\start_backend_https.py
)

REM Start backend in new window
start "VeraProof Backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_HTTPS_PORT% --ssl-keyfile key.pem --ssl-certfile cert.pem --reload"
cd ..

echo [OK] Backend API started
echo     - HTTPS: https://localhost:%BACKEND_HTTPS_PORT%
echo     - Docs: https://localhost:%BACKEND_HTTPS_PORT%/docs
echo.

timeout /t 2 /nobreak >nul

REM Start Partner Dashboard
echo Starting Partner Dashboard (port %PARTNER_DASHBOARD_PORT%)...
cd partner-dashboard

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

REM Start dashboard in new window
start "VeraProof Partner Dashboard" cmd /k "npm start"
cd ..

echo [OK] Partner Dashboard started
echo     - URL: http://localhost:%PARTNER_DASHBOARD_PORT%
echo.

timeout /t 2 /nobreak >nul

REM Start Verification Interface
echo Starting Verification Interface (port %VERIFICATION_INTERFACE_PORT%)...
start "VeraProof Verification Interface" cmd /k "python -m http.server %VERIFICATION_INTERFACE_PORT% --directory verification-interface"

echo [OK] Verification Interface started
echo     - URL: http://localhost:%VERIFICATION_INTERFACE_PORT%
echo.

REM Print summary
echo.
echo ================================================================
echo          VeraProof AI Development Environment Ready!
echo ================================================================
echo.
echo Service URLs:
echo   Backend API (HTTPS):      https://localhost:%BACKEND_HTTPS_PORT%
echo   Backend API Docs:         https://localhost:%BACKEND_HTTPS_PORT%/docs
echo   Partner Dashboard:        http://localhost:%PARTNER_DASHBOARD_PORT%
echo   Verification Interface:   http://localhost:%VERIFICATION_INTERFACE_PORT%
echo   PostgreSQL:               localhost:%POSTGRES_PORT%
echo   LocalStack (S3):          http://localhost:%LOCALSTACK_PORT%
echo.
echo Notes:
echo   - You'll need to accept the self-signed SSL certificate warning
echo   - Each service runs in its own window
echo   - Close the windows to stop individual services
echo   - Run 'docker-compose down' to stop Docker services
echo.
echo ================================================================
echo.
echo Press any key to open the Partner Dashboard in your browser...
pause >nul

start http://localhost:%PARTNER_DASHBOARD_PORT%

echo.
echo All services are running. Close this window when done.
echo.
pause
