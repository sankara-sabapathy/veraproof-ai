# VeraProof AI - Deployment Validation Script
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "VeraProof AI - Deployment Validation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ApiUrl = "https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com"
$DashboardUrl = "https://d3gc0en9my7apv.cloudfront.net"
$VerificationUrl = "https://dmieqia655oqd.cloudfront.net"

$PassCount = 0
$FailCount = 0

# Test API Health
Write-Host "`n=== Testing API Health ===" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: API Health Check (200 OK)" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor White
    $PassCount++
} catch {
    Write-Host "FAIL: API Health Check" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $FailCount++
}

# Test Dashboard
Write-Host "`n=== Testing Dashboard ===" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $DashboardUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: Dashboard (200 OK)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL: Dashboard" -ForegroundColor Red
    $FailCount++
}

# Test Verification
Write-Host "`n=== Testing Verification ===" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $VerificationUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "PASS: Verification Interface (200 OK)" -ForegroundColor Green
    $PassCount++
} catch {
    Write-Host "FAIL: Verification Interface" -ForegroundColor Red
    $FailCount++
}

# Summary
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Tests Passed: $PassCount" -ForegroundColor Green
Write-Host "Tests Failed: $FailCount" -ForegroundColor $(if ($FailCount -eq 0) { "Green" } else { "Red" })
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "`nEndpoints:" -ForegroundColor Yellow
Write-Host "  API: $ApiUrl" -ForegroundColor White
Write-Host "  Dashboard: $DashboardUrl" -ForegroundColor White
Write-Host "  Verification: $VerificationUrl" -ForegroundColor White
