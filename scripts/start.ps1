# VeraProof AI - Start All Services (Windows PowerShell)

Write-Host "Starting VeraProof AI Services..." -ForegroundColor Green

# Start Docker services
Write-Host "`nStarting Docker services (PostgreSQL, LocalStack)..." -ForegroundColor Cyan
docker-compose up -d

# Wait for services to be ready
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running
Write-Host "`nChecking service status..." -ForegroundColor Cyan
docker-compose ps

Write-Host "`n✅ Services started successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "2. Start verification interface: cd verification-interface && python -m http.server 3000"
Write-Host "3. Start partner dashboard: cd partner-dashboard && npm start"
