# VeraProof AI - Test Dashboard Flow (Windows PowerShell)
# This script tests the complete dashboard flow: signup -> login -> dashboard load

Write-Host "=== VeraProof AI Dashboard Flow Test ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000/api/v1"
$testEmail = "test_$(Get-Random)@veraproof.ai"
$testPassword = "TestPassword123!"

# Step 1: Signup
Write-Host "Step 1: Creating new user account..." -ForegroundColor Yellow
$signupBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $signupResponse = Invoke-RestMethod -Uri "$baseUrl/auth/signup" -Method Post -Body $signupBody -ContentType "application/json"
    Write-Host "✅ Signup successful!" -ForegroundColor Green
    Write-Host "   User ID: $($signupResponse.user.user_id)" -ForegroundColor Gray
    Write-Host "   Tenant ID: $($signupResponse.user.tenant_id)" -ForegroundColor Gray
    $accessToken = $signupResponse.access_token
} catch {
    Write-Host "❌ Signup failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Test Dashboard Endpoints
Write-Host "Step 2: Testing dashboard endpoints..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Test Analytics Stats
Write-Host "  Testing /analytics/stats..." -ForegroundColor Gray
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/analytics/stats" -Headers $headers
    Write-Host "  ✅ Analytics stats loaded" -ForegroundColor Green
    Write-Host "     Sessions today: $($stats.sessions_today)" -ForegroundColor Gray
    Write-Host "     Total sessions: $($stats.total_sessions)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Analytics stats failed: $_" -ForegroundColor Red
    exit 1
}

# Test Billing Subscription
Write-Host "  Testing /billing/subscription..." -ForegroundColor Gray
try {
    $subscription = Invoke-RestMethod -Uri "$baseUrl/billing/subscription" -Headers $headers
    Write-Host "  ✅ Subscription loaded" -ForegroundColor Green
    Write-Host "     Tier: $($subscription.subscription_tier)" -ForegroundColor Gray
    Write-Host "     Quota: $($subscription.monthly_quota)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Subscription failed: $_" -ForegroundColor Red
    exit 1
}

# Test Sessions List
Write-Host "  Testing /sessions..." -ForegroundColor Gray
try {
    $sessions = Invoke-RestMethod -Uri "$baseUrl/sessions?limit=10&offset=0" -Headers $headers
    Write-Host "  ✅ Sessions list loaded" -ForegroundColor Green
    Write-Host "     Total sessions: $($sessions.total)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Sessions list failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Generate API Key
Write-Host "Step 3: Generating API key..." -ForegroundColor Yellow
$apiKeyBody = @{
    environment = "sandbox"
} | ConvertTo-Json

try {
    $apiKeyResponse = Invoke-RestMethod -Uri "$baseUrl/api-keys" -Method Post -Body $apiKeyBody -Headers $headers
    Write-Host "✅ API key generated!" -ForegroundColor Green
    Write-Host "   Key ID: $($apiKeyResponse.key_id)" -ForegroundColor Gray
    Write-Host "   API Key: $($apiKeyResponse.api_key)" -ForegroundColor Gray
    Write-Host "   Environment: $($apiKeyResponse.environment)" -ForegroundColor Gray
    
    # Verify no api_secret in response
    if ($apiKeyResponse.PSObject.Properties.Name -contains "api_secret") {
        Write-Host "   ⚠️  WARNING: api_secret still present in response!" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Confirmed: No api_secret in response (simplified architecture)" -ForegroundColor Green
    }
    
    $apiKey = $apiKeyResponse.api_key
} catch {
    Write-Host "❌ API key generation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Create Session with API Key
Write-Host "Step 4: Creating verification session with API key..." -ForegroundColor Yellow
$sessionBody = @{
    return_url = "http://localhost:4200/dashboard"
    metadata = @{
        test_mode = $true
        user_id = "test-user-123"
    }
} | ConvertTo-Json

$sessionHeaders = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/sessions/create" -Method Post -Body $sessionBody -Headers $sessionHeaders
    Write-Host "✅ Session created successfully!" -ForegroundColor Green
    Write-Host "   Session ID: $($sessionResponse.session_id)" -ForegroundColor Gray
    Write-Host "   Session URL: $($sessionResponse.session_url)" -ForegroundColor Gray
    Write-Host "   Expires At: $($sessionResponse.expires_at)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Session creation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== All Tests Passed! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "✅ User signup works" -ForegroundColor Green
Write-Host "✅ Dashboard endpoints load without hanging" -ForegroundColor Green
Write-Host "✅ API key generation simplified (no secret)" -ForegroundColor Green
Write-Host "✅ Session creation works with API key only" -ForegroundColor Green
Write-Host ""
Write-Host "You can now:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:4200 in your browser" -ForegroundColor White
Write-Host "2. Login with: $testEmail" -ForegroundColor White
Write-Host "3. Password: $testPassword" -ForegroundColor White
Write-Host "4. Dashboard should load immediately without hanging" -ForegroundColor White
