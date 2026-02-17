# VeraProof AI - Generate Test Session URL (Windows PowerShell)

Write-Host "Generating Test Session URL..." -ForegroundColor Green

# API endpoint
$apiUrl = "http://localhost:8000/api/v1/sessions/create"
$apiKey = "test-api-key-sandbox"

# Request body
$body = @{
    return_url = "http://localhost:4200/dashboard"
    metadata = @{
        user_id = "test-user-123"
        test_mode = $true
    }
} | ConvertTo-Json

# Headers
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    Write-Host "`nCalling API..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -Headers $headers -ErrorAction Stop
    
    Write-Host "`n✅ Session created successfully!" -ForegroundColor Green
    Write-Host "`nSession ID: $($response.session_id)" -ForegroundColor Yellow
    Write-Host "Session URL: $($response.session_url)" -ForegroundColor Yellow
    Write-Host "Expires At: $($response.expires_at)" -ForegroundColor Yellow
    
    Write-Host "`nYou can now open this URL on your mobile device to start verification." -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ Failed to create session" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure the backend is running on http://localhost:8000" -ForegroundColor Yellow
}
