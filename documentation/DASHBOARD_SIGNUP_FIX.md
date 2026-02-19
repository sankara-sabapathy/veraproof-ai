# Dashboard Signup Issue - Fix Guide

## Problem

The Partner Dashboard signup is failing with "Failed to create account" error.

**Root Cause:** The backend API is not configured with the correct CORS origins to allow requests from the production CloudFront URL.

## Current Configuration

### Backend CORS Origins (WRONG)
```
http://localhost:3000,http://localhost:4200
```

### Production URLs (NEEDED)
- Dashboard: `https://d3gc0en9my7apv.cloudfront.net`
- Verification: `https://dmieqia655oqd.cloudfront.net`

## Solution

The backend container needs to be redeployed with updated environment variables including the production CORS origins.

### Required Environment Variables

```bash
# CORS - Must include production URLs
CORS_ORIGINS=https://d3gc0en9my7apv.cloudfront.net,https://dmieqia655oqd.cloudfront.net,http://localhost:4200,http://localhost:3000

# JWT Secret (generate a secure one)
JWT_SECRET=<secure-random-string>

# Application URLs
BACKEND_URL=https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com
FRONTEND_DASHBOARD_URL=https://d3gc0en9my7apv.cloudfront.net
FRONTEND_VERIFICATION_URL=https://dmieqia655oqd.cloudfront.net
```

## Fix Steps

### Option 1: Redeploy with Updated Script

1. Set AWS credentials:
```powershell
$env:AWS_ACCESS_KEY_ID = "..."
$env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_SESSION_TOKEN = "..."
```

2. Run the updated deployment script:
```powershell
.\scripts\deploy-backend-with-cors.ps1
```

### Option 2: Manual Deployment

1. Get database credentials:
```bash
aws lightsail get-relational-database-master-user-password \
  --relational-database-name veraproof-db-prod \
  --region ap-south-1
```

2. URL-encode the password:
```python
import urllib.parse
password = "YOUR_PASSWORD"
encoded = urllib.parse.quote(password, safe='')
print(encoded)
```

3. Create `deployment-with-cors.json`:
```json
{
  "containers": {
    "app": {
      "image": ":veraproof-api-prod.veraproof-api.1",
      "ports": {
        "8000": "HTTP"
      },
      "environment": {
        "DATABASE_URL": "postgresql://veraproof_admin:ENCODED_PASSWORD@ENDPOINT:5432/veraproof",
        "AWS_REGION": "ap-south-1",
        "ARTIFACTS_BUCKET": "veraproof-artifacts-prod-612850243659",
        "BRANDING_BUCKET": "veraproof-branding-prod-612850243659",
        "COGNITO_USER_POOL_ID": "ap-south-1_l4nlq0n8y",
        "COGNITO_CLIENT_ID": "2b7tq4gj7426iamis9snrrh2fo",
        "JWT_SECRET": "GENERATE_SECURE_SECRET",
        "JWT_ALGORITHM": "HS256",
        "JWT_EXPIRATION_HOURS": "1",
        "REFRESH_TOKEN_EXPIRATION_DAYS": "30",
        "ENVIRONMENT": "production",
        "STAGE": "prod",
        "BACKEND_URL": "https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com",
        "FRONTEND_DASHBOARD_URL": "https://d3gc0en9my7apv.cloudfront.net",
        "FRONTEND_VERIFICATION_URL": "https://dmieqia655oqd.cloudfront.net",
        "CORS_ORIGINS": "https://d3gc0en9my7apv.cloudfront.net,https://dmieqia655oqd.cloudfront.net,http://localhost:4200,http://localhost:3000",
        "MAX_CONCURRENT_SESSIONS": "10",
        "API_RATE_LIMIT_PER_MINUTE": "100",
        "SESSION_EXPIRATION_MINUTES": "15",
        "SESSION_EXTENSION_MINUTES": "10",
        "ARTIFACT_RETENTION_DAYS": "90",
        "SIGNED_URL_EXPIRATION_SECONDS": "3600",
        "USE_MOCK_SAGEMAKER": "true",
        "USE_MOCK_RAZORPAY": "true",
        "USE_LOCAL_AUTH": "true"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "app",
    "containerPort": 8000,
    "healthCheck": {
      "path": "/health",
      "intervalSeconds": 30,
      "timeoutSeconds": 5,
      "healthyThreshold": 2,
      "unhealthyThreshold": 2,
      "successCodes": "200"
    }
  }
}
```

4. Deploy:
```bash
aws lightsail create-container-service-deployment \
  --service-name veraproof-api-prod \
  --cli-input-json file://deployment-with-cors.json \
  --region ap-south-1
```

5. Wait for deployment (5-10 minutes):
```bash
aws lightsail get-container-services \
  --service-name veraproof-api-prod \
  --region ap-south-1 \
  --query 'containerServices[0].currentDeployment.state'
```

## Verification

After redeployment, test the signup:

1. Open browser console (F12)
2. Go to https://d3gc0en9my7apv.cloudfront.net
3. Click "Sign Up"
4. Fill in email and password
5. Click "Create Account"
6. Check console for any CORS errors

### Expected Behavior
- No CORS errors in console
- Account created successfully
- Redirected to dashboard

### If Still Failing
Check browser console for specific error messages and verify:
- API is responding: `curl https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/health`
- CORS headers are present in response
- Network tab shows the request/response

## Frontend Configuration

The frontend also needs to be rebuilt with production configuration:

### Update Angular Environment

File: `partner-dashboard/src/environments/environment.prod.ts`
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com',
  cognito: {
    userPoolId: 'ap-south-1_l4nlq0n8y',
    clientId: '2b7tq4gj7426iamis9snrrh2fo',
    region: 'ap-south-1'
  }
};
```

### Rebuild and Redeploy Frontend

```bash
cd partner-dashboard
npm run build -- --configuration=production
aws s3 sync dist/partner-dashboard/browser s3://veraproof-dashboard-prod-612850243659/ --delete
aws cloudfront create-invalidation --distribution-id E22HOO32XSEYNN --paths "/*"
```

## Updated Deployment Scripts

The deployment scripts have been updated to include all required environment variables:

- `scripts/deploy-local.ps1` - Updated with CORS configuration
- `scripts/deploy-local.sh` - Updated with CORS configuration
- `.github/workflows/ci-cd.yml` - Updated with CORS configuration

## Summary

**Issue:** CORS blocking dashboard signup requests  
**Fix:** Redeploy backend with production URLs in CORS_ORIGINS  
**Time:** ~10 minutes for redeployment  
**Impact:** Signup will work after redeployment

---

**Status:** Ready to deploy with correct configuration
