#!/usr/bin/env pwsh
# Local Testing Script for VeraProof AI
# Runs all services and tests locally

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "VeraProof AI - Local Testing" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Step 1: Start Docker services
Write-Host ""
Write-Host "=== Step 1: Starting Docker Services ===" -ForegroundColor Yellow
docker-compose up -d postgres localstack

Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 2: Run backend tests
Write-Host ""
Write-Host "=== Step 2: Running Backend Tests ===" -ForegroundColor Yellow
Set-Location backend

# Create virtual environment if it doesn't exist
if (!(Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Run tests
Write-Host "Running pytest..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://veraproof:veraproof_dev_password@localhost:5432/veraproof"
$env:AWS_ENDPOINT_URL = "http://localhost:4566"
pytest --cov=app --cov-report=term-missing

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend tests failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "Backend tests passed!" -ForegroundColor Green
Set-Location ..

# Step 3: Start backend service
Write-Host ""
Write-Host "=== Step 3: Starting Backend Service ===" -ForegroundColor Yellow
docker-compose up -d backend

Write-Host "Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test backend health
Write-Host "Testing backend health endpoint..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
    Write-Host "Backend health check passed!" -ForegroundColor Green
} catch {
    Write-Host "Backend health check failed!" -ForegroundColor Red
    docker-compose logs backend
    exit 1
}

# Step 4: Test signup endpoint
Write-Host ""
Write-Host "=== Step 4: Testing Signup Endpoint ===" -ForegroundColor Yellow

$SignupData = @{
    email = "test@example.com"
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $Response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/signup" `
        -Method POST `
        -ContentType "application/json" `
        -Body $SignupData `
        -UseBasicParsing
    
    Write-Host "Signup test passed!" -ForegroundColor Green
    $Response.Content | ConvertFrom-Json | ConvertTo-Json
} catch {
    Write-Host "Signup test failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "All Tests Passed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running:" -ForegroundColor Yellow
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "  LocalStack: localhost:4566" -ForegroundColor White
Write-Host ""
Write-Host "To stop services: docker-compose down" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
