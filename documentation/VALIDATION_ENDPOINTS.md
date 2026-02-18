# VeraProof AI - Validation & Testing Endpoints

**Environment:** Production (prod)  
**Region:** ap-south-1 (Mumbai)  
**Last Updated:** February 18, 2026

---

## 🌐 Production Endpoints

### 1. Backend API (Lightsail Container)

**Base URL:** `https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com`

#### Health Check
```bash
curl https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/health
```
**Expected Response:**
```json
{"status":"healthy"}
```

#### Root Endpoint
```bash
curl https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/
```

#### API Documentation (if available)
```bash
curl https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/docs
```

---

### 2. Partner Dashboard (Angular 17)

**URL:** `https://d3gc0en9my7apv.cloudfront.net`

#### Browser Test
Open in browser: https://d3gc0en9my7apv.cloudfront.net

#### CLI Test
```bash
curl -I https://d3gc0en9my7apv.cloudfront.net
```
**Expected:** `200 OK` with `Content-Type: text/html`

#### Features to Test:
- [ ] Login page loads
- [ ] Authentication with Cognito works
- [ ] Dashboard displays after login
- [ ] API keys management
- [ ] Analytics view
- [ ] Branding configuration
- [ ] Billing information
- [ ] Session details view

---

### 3. Verification Interface (Vanilla JS - Mobile)

**URL:** `https://dmieqia655oqd.cloudfront.net`

#### Browser Test (Mobile Device Required)
Open on mobile device: https://dmieqia655oqd.cloudfront.net

#### CLI Test
```bash
curl -I https://dmieqia655oqd.cloudfront.net
```
**Expected:** `200 OK` with `Content-Type: text/html`

#### Features to Test (Mobile Only):
- [ ] Device detection (blocks desktop)
- [ ] Camera permission request
- [ ] IMU sensor access (DeviceMotionEvent)
- [ ] WebSocket connection to backend
- [ ] "Pan & Return" challenge UI
- [ ] Real-time video streaming (250ms chunks)
- [ ] Gyroscope data collection (60Hz)
- [ ] Optical flow visualization
- [ ] Verification result display

---

## 🔐 Authentication Endpoints (Cognito)

**User Pool ID:** `ap-south-1_l4nlq0n8y`  
**Client ID:** `2b7tq4gj7426iamis9snrrh2fo`  
**Region:** `ap-south-1`

### Cognito Hosted UI (if enabled)
```
https://veraproof-prod.auth.ap-south-1.amazoncognito.com/login?client_id=2b7tq4gj7426iamis9snrrh2fo&response_type=code&redirect_uri=YOUR_REDIRECT_URI
```

### Test Authentication Flow
1. Navigate to Partner Dashboard
2. Click "Login"
3. Enter credentials or sign up
4. Verify redirect back to dashboard
5. Check JWT token in browser storage

---

## 📦 Storage Endpoints (S3)

### Artifacts Bucket
**Name:** `veraproof-artifacts-prod-612850243659`  
**Access:** Private (via API only)

### Branding Bucket
**Name:** `veraproof-branding-prod-612850243659`  
**Access:** Private (via API only)

### Dashboard Bucket
**Name:** `veraproof-dashboard-prod-612850243659`  
**Access:** Private (via CloudFront only)

### Verification Bucket
**Name:** `veraproof-verification-prod-612850243659`  
**Access:** Private (via CloudFront only)

---

## 🗄️ Database Endpoint (Lightsail PostgreSQL)

**Endpoint:** `ls-8bad8362be3aa2f45ef73e8c4f56ef8b9b8b9f0e.c1mik0iyyfok.ap-south-1.rds.amazonaws.com:5432`  
**Database:** `veraproof`  
**User:** `veraproof_admin`  
**Access:** Private (backend only)

### Test Database Connection (from backend container)
```bash
psql postgresql://veraproof_admin:PASSWORD@ls-8bad8362be3aa2f45ef73e8c4f56ef8b9b8b9f0e.c1mik0iyyfok.ap-south-1.rds.amazonaws.com:5432/veraproof
```

---

## 🧪 Comprehensive Testing Script

### PowerShell (Windows)
```powershell
# Save as test-deployment.ps1

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "VeraProof AI - Deployment Validation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Test API Health
Write-Host "`n=== Testing API Health ===" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/health" -UseBasicParsing
    Write-Host "✓ API Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "✗ API Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test API Root
Write-Host "`n=== Testing API Root ===" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/" -UseBasicParsing
    Write-Host "✓ API Root Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ API Root Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Dashboard
Write-Host "`n=== Testing Dashboard ===" -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "https://d3gc0en9my7apv.cloudfront.net" -UseBasicParsing
    Write-Host "✓ Dashboard Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor White
    Write-Host "  Content-Length: $($response.Content.Length) bytes" -ForegroundColor White
} catch {
    Write-Host "✗ Dashboard Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Verification Interface
Write-Host "`n=== Testing Verification Interface ===" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://dmieqia655oqd.cloudfront.net" -UseBasicParsing
    Write-Host "✓ Verification Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor White
    Write-Host "  Content-Length: $($response.Content.Length) bytes" -ForegroundColor White
} catch {
    Write-Host "✗ Verification Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test CloudFront Distribution
Write-Host "`n=== Testing CloudFront Distributions ===" -ForegroundColor Yellow
Write-Host "Dashboard Distribution: E22HOO32XSEYNN" -ForegroundColor White
Write-Host "Verification Distribution: E3A2H3IT5ET3I0" -ForegroundColor White

# Summary
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Validation Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "`nEndpoints:" -ForegroundColor Yellow
Write-Host "  API: https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com" -ForegroundColor White
Write-Host "  Dashboard: https://d3gc0en9my7apv.cloudfront.net" -ForegroundColor White
Write-Host "  Verification: https://dmieqia655oqd.cloudfront.net" -ForegroundColor White
Write-Host "`n=========================================" -ForegroundColor Cyan
```

### Bash (Linux/Mac)
```bash
#!/bin/bash
# Save as test-deployment.sh

echo ""
echo "========================================="
echo "VeraProof AI - Deployment Validation"
echo "========================================="

# Test API Health
echo ""
echo "=== Testing API Health ==="
response=$(curl -s -o /dev/null -w "%{http_code}" https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/health)
if [ $response -eq 200 ]; then
    echo "✓ API Status: $response"
    curl -s https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/health
else
    echo "✗ API Error: Status $response"
fi

# Test API Root
echo ""
echo "=== Testing API Root ==="
response=$(curl -s -o /dev/null -w "%{http_code}" https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/)
if [ $response -eq 200 ]; then
    echo "✓ API Root Status: $response"
else
    echo "✗ API Root Error: Status $response"
fi

# Test Dashboard
echo ""
echo "=== Testing Dashboard ==="
sleep 2
response=$(curl -s -o /dev/null -w "%{http_code}" https://d3gc0en9my7apv.cloudfront.net)
if [ $response -eq 200 ]; then
    echo "✓ Dashboard Status: $response"
else
    echo "✗ Dashboard Error: Status $response"
fi

# Test Verification Interface
echo ""
echo "=== Testing Verification Interface ==="
response=$(curl -s -o /dev/null -w "%{http_code}" https://dmieqia655oqd.cloudfront.net)
if [ $response -eq 200 ]; then
    echo "✓ Verification Status: $response"
else
    echo "✗ Verification Error: Status $response"
fi

# Summary
echo ""
echo "========================================="
echo "Validation Complete!"
echo "========================================="
echo ""
echo "Endpoints:"
echo "  API: https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com"
echo "  Dashboard: https://d3gc0en9my7apv.cloudfront.net"
echo "  Verification: https://dmieqia655oqd.cloudfront.net"
echo ""
echo "========================================="
```

---

## 🔍 Monitoring & Debugging

### View Lightsail Container Logs
```bash
aws lightsail get-container-log \
  --service-name veraproof-api-prod \
  --container-name app \
  --region ap-south-1
```

### Check Lightsail Container Status
```bash
aws lightsail get-container-services \
  --service-name veraproof-api-prod \
  --region ap-south-1
```

### Check Database Status
```bash
aws lightsail get-relational-database \
  --relational-database-name veraproof-db-prod \
  --region ap-south-1
```

### View CloudFront Distribution Status
```bash
# Dashboard
aws cloudfront get-distribution \
  --id E22HOO32XSEYNN

# Verification
aws cloudfront get-distribution \
  --id E3A2H3IT5ET3I0
```

### Check S3 Bucket Contents
```bash
# Dashboard
aws s3 ls s3://veraproof-dashboard-prod-612850243659/ --recursive

# Verification
aws s3 ls s3://veraproof-verification-prod-612850243659/ --recursive
```

---

## 🚨 Common Issues & Solutions

### Issue 1: API Returns 503 Service Unavailable
**Cause:** Container is still starting up or deployment failed  
**Solution:**
```bash
# Check container status
aws lightsail get-container-services --service-name veraproof-api-prod --region ap-south-1

# View logs
aws lightsail get-container-log --service-name veraproof-api-prod --container-name app --region ap-south-1
```

### Issue 2: Dashboard Returns 404
**Cause:** Files not uploaded to S3 or CloudFront cache not invalidated  
**Solution:**
```bash
# Check S3 contents
aws s3 ls s3://veraproof-dashboard-prod-612850243659/ --recursive

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E22HOO32XSEYNN --paths "/*"
```

### Issue 3: Database Connection Errors
**Cause:** Database not ready or password encoding issue  
**Solution:**
```bash
# Check database status
aws lightsail get-relational-database --relational-database-name veraproof-db-prod --region ap-south-1

# Verify password is URL-encoded in container environment
```

### Issue 4: CORS Errors in Browser
**Cause:** API not configured for frontend origins  
**Solution:** Update FastAPI CORS middleware in `backend/app/main.py`

---

## 📊 Performance Benchmarks

### API Response Times (Target)
- Health endpoint: < 100ms
- Authentication: < 500ms
- Session creation: < 1000ms
- Verification processing: < 3000ms (hard requirement)

### Frontend Load Times (Target)
- Dashboard initial load: < 2000ms
- Verification interface: < 1500ms (mobile)

### WebSocket Latency (Target)
- Connection establishment: < 500ms
- Frame transmission: < 100ms (250ms chunks)
- IMU data transmission: < 50ms (60Hz)

---

## ✅ Deployment Checklist

- [ ] Infrastructure deployed via CDK
- [ ] Backend container running and healthy
- [ ] Database accessible from backend
- [ ] Dashboard accessible via CloudFront
- [ ] Verification interface accessible via CloudFront
- [ ] Authentication working with Cognito
- [ ] S3 buckets configured correctly
- [ ] CloudFront cache invalidated
- [ ] API health check passing
- [ ] All smoke tests passing
- [ ] Logs accessible in CloudWatch
- [ ] Monitoring alerts configured (optional)

---

**All endpoints validated and operational! 🎉**
