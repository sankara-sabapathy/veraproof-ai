# VeraProof AI - Testing Guide

## Overview

This guide walks you through testing the complete VeraProof AI system, from signup to mobile verification.

## Prerequisites

Before testing, ensure all services are running:

```powershell
# 1. Start Docker services
docker-compose up -d

# 2. Verify Docker services
docker ps
# Should show: veraproof-postgres and veraproof-localstack

# 3. Start Backend (in separate terminal)
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. Start Dashboard (in separate terminal)
cd partner-dashboard
npm start
```

## Test Sequence

### 1. Partner Dashboard Signup & Login

**Test Signup:**
1. Open http://localhost:4200
2. Click "Sign Up" tab
3. Enter email: `your@email.com`
4. Enter password: `password123` (min 6 chars)
5. Confirm password: `password123`
6. Click "Create Account"
7. ✅ Should see success message
8. ✅ Should redirect to dashboard

**Test Login:**
1. Logout from dashboard
2. Return to http://localhost:4200
3. Click "Login" tab
4. Enter your credentials
5. Click "Login"
6. ✅ Should redirect to dashboard

### 2. API Key Generation

**Test API Key Creation:**
1. In dashboard, click "API Keys" in sidebar
2. Click "Generate New Key"
3. Select environment: "Sandbox"
4. Click "Generate"
5. ✅ Should see new API key displayed
6. Copy the API key (format: `vp_sandbox_...`)

### 3. Session Creation via API

**Test Session Creation:**

```powershell
# Replace YOUR_API_KEY with the key from step 2
$apiKey = "vp_sandbox_..."
$body = @{
    metadata = @{
        user_id = "test-user-123"
        transaction_id = "txn-456"
    }
    return_url = "https://yourapp.com/callback"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/v1/sessions/create" `
    -Method POST `
    -Headers @{Authorization="Bearer $apiKey"} `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing

$session = $response.Content | ConvertFrom-Json
Write-Host "Session ID: $($session.session_id)"
Write-Host "Session URL: $($session.session_url)"
```

✅ Should return:
- `session_id`: UUID
- `session_url`: URL for verification
- `expires_at`: Timestamp

### 4. Verification Interface (Desktop Test)

**Test Device Detection:**
1. Open the `session_url` from step 3 in desktop browser
2. ✅ Should see "Desktop/Laptop Detected" message
3. ✅ Should see "Please open this link on a mobile device"
4. ✅ Should NOT allow proceeding

### 5. Mobile Verification (HTTPS Required)

**Setup HTTPS Mode:**

```powershell
# Stop HTTP backend (Ctrl+C in backend terminal)

# Start HTTPS backend
python scripts\start_backend_https.py

# Get your local IP
ipconfig
# Look for IPv4 Address (e.g., 192.168.20.5)
```

**Test on Mobile Device:**

1. Ensure mobile is on same WiFi network
2. Open session URL on mobile: `https://192.168.20.5:8443/verification-interface/?session_id=...`
3. Accept self-signed certificate warning
4. ✅ Should see VeraProof landing page
5. Click "Start Verification"
6. Grant camera permission
7. Grant motion sensor permission

**Test Pan & Return Challenge:**

1. **Baseline Phase (1 second):**
   - ✅ Should see "Hold Still" instruction
   - ✅ Should see countdown timer
   - ✅ Camera should be recording
   - ✅ IMU data should be collecting

2. **Pan Phase (2 seconds):**
   - ✅ Should see "Tilt Phone Right" instruction
   - ✅ Should see visual indicator
   - Tilt phone to the right
   - ✅ Should capture gyro gamma data

3. **Return Phase (2 seconds):**
   - ✅ Should see "Return to Center" instruction
   - Return phone to center position
   - ✅ Should complete data collection

4. **Processing Phase:**
   - ✅ Should see "Processing..." message
   - ✅ Should show loading spinner
   - Backend calculates Pearson correlation

5. **Results Phase:**
   - ✅ Should see verification result
   - ✅ Should show trust score (0-100)
   - ✅ Should show "Verified" or "Suspicious"
   - ✅ Should redirect to return_url after 3 seconds

### 6. Session Results via API

**Test Results Retrieval:**

```powershell
$sessionId = "session-id-from-step-3"
$apiKey = "vp_sandbox_..."

$response = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/v1/sessions/$sessionId/results" `
    -Method GET `
    -Headers @{Authorization="Bearer $apiKey"} `
    -UseBasicParsing

$results = $response.Content | ConvertFrom-Json
Write-Host "Tier 1 Score: $($results.tier_1_score)"
Write-Host "Final Trust Score: $($results.final_trust_score)"
Write-Host "Correlation: $($results.correlation_value)"
```

✅ Should return:
- `tier_1_score`: 0-100
- `tier_2_score`: 0-100 (if triggered)
- `final_trust_score`: 0-100
- `correlation_value`: -1 to 1
- `reasoning`: Text explanation
- `state`: "completed"

### 7. Artifact Download

**Test Artifact Access:**

```powershell
$sessionId = "session-id-from-step-3"
$apiKey = "vp_sandbox_..."

# Get video artifact
$videoUrl = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/v1/sessions/$sessionId/video" `
    -Method GET `
    -Headers @{Authorization="Bearer $apiKey"} `
    -UseBasicParsing | 
    ConvertFrom-Json | 
    Select-Object -ExpandProperty url

Write-Host "Video URL: $videoUrl"

# Get IMU data
$imuUrl = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/v1/sessions/$sessionId/imu-data" `
    -Method GET `
    -Headers @{Authorization="Bearer $apiKey"} `
    -UseBasicParsing | 
    ConvertFrom-Json | 
    Select-Object -ExpandProperty url

Write-Host "IMU Data URL: $imuUrl"

# Get optical flow data
$flowUrl = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/v1/sessions/$sessionId/optical-flow" `
    -Method GET `
    -Headers @{Authorization="Bearer $apiKey"} `
    -UseBasicParsing | 
    ConvertFrom-Json | 
    Select-Object -ExpandProperty url

Write-Host "Optical Flow URL: $flowUrl"
```

✅ Should return signed URLs (valid for 1 hour)

### 8. Dashboard Analytics

**Test Analytics View:**
1. In dashboard, click "Analytics"
2. ✅ Should see session list
3. ✅ Should see session statistics
4. Click on a session
5. ✅ Should see session details
6. ✅ Should see correlation graph
7. ✅ Should see trust scores
8. ✅ Should see download buttons for artifacts

### 9. Branding Customization

**Test Branding Upload:**
1. In dashboard, click "Branding"
2. Upload logo (PNG/JPG/SVG, max 2MB)
3. ✅ Should see preview
4. Select primary color (e.g., #FF5733)
5. Select secondary color (e.g., #33FF57)
6. Select button color (e.g., #3357FF)
7. Click "Save"
8. ✅ Should see success message

**Test Branding in Verification:**
1. Create new session
2. Open session URL on mobile
3. ✅ Should see custom logo
4. ✅ Should see custom colors
5. ✅ Buttons should use custom color

### 10. Quota Management

**Test Quota Enforcement:**

```powershell
# Check current quota
$apiKey = "vp_sandbox_..."
$response = Invoke-WebRequest `
    -Uri "http://localhost:8000/api/v1/billing/subscription" `
    -Method GET `
    -Headers @{Authorization="Bearer $apiKey"} `
    -UseBasicParsing

$subscription = $response.Content | ConvertFrom-Json
Write-Host "Monthly Quota: $($subscription.monthly_quota)"
Write-Host "Current Usage: $($subscription.current_usage)"
Write-Host "Remaining: $($subscription.monthly_quota - $subscription.current_usage)"
```

**Test Quota Exceeded:**
1. Create sessions until quota is exhausted
2. Attempt to create one more session
3. ✅ Should return 429 error
4. ✅ Error message: "Usage quota exceeded"

### 11. Rate Limiting

**Test API Rate Limit:**

```powershell
# Send 101 requests rapidly
$apiKey = "vp_sandbox_..."
for ($i = 1; $i -le 101; $i++) {
    try {
        Invoke-WebRequest `
            -Uri "http://localhost:8000/api/v1/analytics/stats" `
            -Method GET `
            -Headers @{Authorization="Bearer $apiKey"} `
            -UseBasicParsing | Out-Null
        Write-Host "Request $i: Success"
    } catch {
        Write-Host "Request $i: Rate limited (429)" -ForegroundColor Red
    }
}
```

✅ Should see 429 errors after 100 requests

### 12. Webhook Delivery

**Test Webhook Configuration:**
1. Set up webhook endpoint (use webhook.site for testing)
2. In dashboard, configure webhook URL
3. Complete a verification
4. ✅ Should receive webhook POST request
5. ✅ Should include HMAC signature
6. ✅ Should include complete session data

## Expected Results Summary

### Successful Verification (r ≥ 0.85)
- Tier 1 Score: 85-100
- Final Trust Score: 85-100
- Status: "Verified"
- Reasoning: "Strong correlation between sensor and video data"

### Suspicious Verification (r < 0.85)
- Tier 1 Score: 0-84
- Tier 2 triggered: Yes
- Final Trust Score: Weighted average
- Status: "Suspicious"
- Reasoning: "Weak correlation suggests potential fraud"

## Troubleshooting

### Backend Not Starting
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <PID> /F

# Restart backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Services Not Running
```powershell
# Check Docker Desktop is running
docker ps

# Restart services
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs postgres
docker-compose logs localstack
```

### Mobile Camera Not Working
- Ensure using HTTPS (required for camera/sensors)
- Accept certificate warnings
- Grant camera permission when prompted
- Grant motion sensor permission when prompted
- Ensure mobile is on same network

### Session Creation Fails
- Verify API key is correct
- Check quota hasn't been exceeded
- Verify backend is running
- Check backend logs for errors

### Verification Stuck on Processing
- Check backend logs for errors
- Verify LocalStack is running
- Check optical flow computation didn't crash
- Verify IMU data was collected

## Performance Benchmarks

### Tier 1 Analysis (Target: < 3 seconds)
- Video processing: ~500ms
- Optical flow computation: ~1000ms
- IMU data processing: ~100ms
- Correlation calculation: ~50ms
- **Total: ~1650ms** ✅

### Tier 2 Analysis (If triggered)
- AI forensics (mock): 1-3 seconds
- **Total with Tier 2: ~3-5 seconds**

### WebSocket Latency
- Video chunk transmission: < 50ms
- IMU batch transmission: < 20ms
- Phase change notification: < 10ms

## Next Steps

After successful testing:
1. Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. Review [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
3. Plan production deployment
4. Configure real AWS services (S3, SageMaker)
5. Set up monitoring and logging
6. Configure production authentication (Cognito)
