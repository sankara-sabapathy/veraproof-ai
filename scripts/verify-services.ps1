# VeraProof AI - Verify Services Status (Windows PowerShell)

Write-Host "Verifying VeraProof AI Services..." -ForegroundColor Green

# Check Docker services
Write-Host "`n=== Docker Services ===" -ForegroundColor Cyan
docker-compose ps

# Check PostgreSQL
Write-Host "`n=== PostgreSQL Connection ===" -ForegroundColor Cyan
try {
    $env:PGPASSWORD = "veraproof_dev_password"
    psql -h localhost -U veraproof -d veraproof -c "SELECT 1;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL is accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ PostgreSQL connection failed: $_" -ForegroundColor Red
}

# Check LocalStack
Write-Host "`n=== LocalStack S3 ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4566/_localstack/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ LocalStack is running" -ForegroundColor Green
} catch {
    Write-Host "❌ LocalStack is not accessible" -ForegroundColor Red
}

# Check Backend
Write-Host "`n=== Backend API ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Backend API is running (http://localhost:8000)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend API is not running on port 8000" -ForegroundColor Yellow
}

# Check Frontend
Write-Host "`n=== Verification Interface ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Verification Interface is running (http://localhost:3000)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Verification Interface is not running on port 3000" -ForegroundColor Yellow
}

# Check Dashboard
Write-Host "`n=== Partner Dashboard ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4200" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Partner Dashboard is running (http://localhost:4200)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Partner Dashboard is not running on port 4200" -ForegroundColor Yellow
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Check the status above to ensure all services are running correctly."
