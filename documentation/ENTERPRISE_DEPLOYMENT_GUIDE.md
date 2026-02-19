# Enterprise Deployment Guide - VeraProof AI

## Overview

This guide describes the enterprise-grade deployment architecture for VeraProof AI, which uses AWS SSM Parameter Store to manage cross-stack dependencies and ensure seamless, robust deployments.

## Architecture

### Deployment Strategy: Two-Phase with SSM Parameter Store

**Phase 1: Core Infrastructure**
```
Storage Stack → Frontend Stack → Lightsail Stack
```

**Phase 2: Authentication**
```
Auth Stack (uses Frontend URLs from SSM)
```

### Why This Approach?

1. **Eliminates Circular Dependencies:** Frontend needs API URL, Lightsail needs Frontend URLs for CORS
2. **Centralized Configuration:** All URLs stored in SSM Parameter Store
3. **Idempotent Deployments:** Can redeploy any stack without breaking others
4. **Environment Consistency:** Same configuration across dev/staging/prod

## SSM Parameter Store Structure

All configuration is stored in SSM with the following hierarchy:

```
/veraproof/{stage}/
├── frontend/
│   ├── dashboard_url          # CloudFront dashboard URL
│   └── verification_url       # CloudFront verification URL
├── api/
│   └── url                    # Lightsail API URL
├── cognito/
│   ├── user_pool_id          # Cognito User Pool ID
│   └── client_id             # Cognito Client ID
└── database/
    ├── endpoint              # Database endpoint
    └── port                  # Database port
```

## Stack Dependencies

### 1. Storage Stack
**Deploys:** S3 buckets for artifacts and branding  
**Dependencies:** None  
**Outputs:** Bucket names and ARNs

### 2. Frontend Stack
**Deploys:** S3 buckets + CloudFront distributions  
**Dependencies:** Storage Stack  
**Outputs:** 
- CloudFront URLs (dashboard, verification)
- Distribution IDs
- Bucket names
**SSM Parameters Created:**
- `/veraproof/{stage}/frontend/dashboard_url`
- `/veraproof/{stage}/frontend/verification_url`

### 3. Lightsail Stack
**Deploys:** Container service + PostgreSQL database  
**Dependencies:** Storage Stack, Frontend Stack  
**Inputs:** Frontend URLs (for CORS configuration)  
**Outputs:** 
- Container service name
- API URL
- Database endpoint
**SSM Parameters Created:**
- `/veraproof/{stage}/api/url`
- `/veraproof/{stage}/database/endpoint`
- `/veraproof/{stage}/database/port`

### 4. Auth Stack
**Deploys:** Cognito User Pool + Client  
**Dependencies:** Frontend Stack  
**Inputs:** Frontend URLs (for OAuth callbacks)  
**Outputs:**
- User Pool ID
- Client ID
- Auth domain
- Configured callback URLs
**SSM Parameters Created:**
- `/veraproof/{stage}/cognito/user_pool_id`
- `/veraproof/{stage}/cognito/client_id`

## Cognito Configuration

### OAuth Callback URLs

The Auth Stack automatically configures Cognito with the correct callback URLs:

**Production:**
- `https://{cloudfront-dashboard-url}/callback`
- `https://{cloudfront-dashboard-url}/logout`

**Development:**
- `http://localhost:4200/callback`
- `http://localhost:4200/logout`

### CORS Configuration

Cognito is configured to allow requests from:
- Production CloudFront URLs (from SSM)
- Local development URLs (localhost:4200, localhost:3000)

## Backend Environment Variables

The backend container receives complete configuration:

```bash
# Stage and Region
STAGE=prod
ENVIRONMENT=production
AWS_REGION=ap-south-1

# Database (from Lightsail)
DATABASE_URL=postgresql://veraproof_admin:{password}@{endpoint}:5432/veraproof

# AWS Resources
ARTIFACTS_BUCKET=veraproof-artifacts-prod-{account}
BRANDING_BUCKET=veraproof-branding-prod-{account}

# Cognito (from SSM)
COGNITO_USER_POOL_ID={from SSM}
COGNITO_CLIENT_ID={from SSM}

# JWT
JWT_SECRET={auto-generated}
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=1
REFRESH_TOKEN_EXPIRATION_DAYS=30

# Application URLs (from SSM)
BACKEND_URL={from SSM: /veraproof/{stage}/api/url}
FRONTEND_DASHBOARD_URL={from SSM: /veraproof/{stage}/frontend/dashboard_url}
FRONTEND_VERIFICATION_URL={from SSM: /veraproof/{stage}/frontend/verification_url}

# CORS - Includes all frontend URLs
CORS_ORIGINS={dashboard},{verification},http://localhost:4200,http://localhost:3000

# Rate Limiting
MAX_CONCURRENT_SESSIONS=10
API_RATE_LIMIT_PER_MINUTE=100

# Session Management
SESSION_EXPIRATION_MINUTES=15
SESSION_EXTENSION_MINUTES=10

# Storage
ARTIFACT_RETENTION_DAYS=90
SIGNED_URL_EXPIRATION_SECONDS=3600

# Mock Services
USE_MOCK_SAGEMAKER=true
USE_MOCK_RAZORPAY=true
USE_LOCAL_AUTH=true
```

## Frontend Configuration

The frontend environment is automatically generated from SSM parameters:

```typescript
// partner-dashboard/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '{from SSM: /veraproof/{stage}/api/url}',
  cognito: {
    userPoolId: '{from SSM: /veraproof/{stage}/cognito/user_pool_id}',
    clientId: '{from SSM: /veraproof/{stage}/cognito/client_id}',
    region: 'ap-south-1'
  }
};
```

## Deployment Process

### Prerequisites

1. AWS CLI configured with credentials
2. Node.js 18+ and npm
3. Python 3.12+
4. Docker Desktop running
5. AWS CDK installed (`npm install -g aws-cdk`)

### Step-by-Step Deployment

```powershell
# 1. Set AWS credentials
$env:AWS_ACCESS_KEY_ID = "YOUR_ACCESS_KEY"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_SECRET_KEY"
$env:AWS_SESSION_TOKEN = "YOUR_SESSION_TOKEN"  # If using temporary credentials

# 2. Run enterprise deployment script
.\scripts\deploy-enterprise.ps1 -Stage prod

# 3. Wait for completion (~20-25 minutes)
# The script will:
# - Deploy all infrastructure stacks
# - Store configuration in SSM
# - Build and deploy backend container
# - Build and deploy frontend
# - Run verification tests
```

### What the Script Does

1. **Deploy Infrastructure** (~5 min)
   - Storage, Frontend, Lightsail, Auth stacks
   - Stores all URLs in SSM Parameter Store

2. **Retrieve Configuration** (~10 sec)
   - Reads all parameters from SSM
   - Validates configuration

3. **Deploy Backend** (~8 min)
   - Builds Docker image
   - Pushes to Lightsail
   - Deploys with complete environment variables
   - Waits for ACTIVE status

4. **Update Frontend Config** (~1 min)
   - Generates environment.prod.ts from SSM
   - Ensures API URL and Cognito config are correct

5. **Deploy Frontend** (~5 min)
   - Builds Angular application
   - Uploads to S3
   - Invalidates CloudFront cache

6. **Verification** (~1 min)
   - Tests API health endpoint
   - Tests dashboard accessibility
   - Tests verification interface

## Verification Checklist

After deployment, verify:

- [ ] All CDK stacks deployed successfully
- [ ] SSM parameters created and populated
- [ ] Backend container status: ACTIVE
- [ ] API health check returns 200 OK
- [ ] Dashboard loads without errors
- [ ] Verification interface loads
- [ ] No CORS errors in browser console
- [ ] Signup creates account successfully
- [ ] Login works with created account
- [ ] Cognito callback URLs match CloudFront URLs

## Troubleshooting

### Stack Deployment Fails

```powershell
# Check CDK diff
cd infrastructure
cdk diff --context stage=prod --context account={account-id}

# View CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name Veraproof-Frontend-Stack-prod \
  --region ap-south-1
```

### SSM Parameters Missing

```powershell
# List all parameters
aws ssm get-parameters-by-path \
  --path "/veraproof/prod" \
  --recursive \
  --region ap-south-1

# Get specific parameter
aws ssm get-parameter \
  --name "/veraproof/prod/frontend/dashboard_url" \
  --region ap-south-1
```

### Backend Deployment Fails

```powershell
# Check Lightsail logs
aws lightsail get-container-log \
  --service-name veraproof-api-prod \
  --container-name app \
  --region ap-south-1

# Check deployment status
aws lightsail get-container-services \
  --service-name veraproof-api-prod \
  --region ap-south-1
```

### CORS Errors

1. Check backend CORS_ORIGINS environment variable
2. Verify CloudFront URLs in SSM match actual URLs
3. Check Cognito callback URLs
4. Verify browser is using correct CloudFront URL

## Updating Configuration

### Update Frontend URLs

If CloudFront URLs change:

```powershell
# Update SSM parameters
aws ssm put-parameter \
  --name "/veraproof/prod/frontend/dashboard_url" \
  --value "https://new-cloudfront-url.cloudfront.net" \
  --overwrite \
  --region ap-south-1

# Redeploy backend with new CORS
.\scripts\deploy-enterprise.ps1 -Stage prod
```

### Update Cognito Callback URLs

```powershell
# Get current client configuration
aws cognito-idp describe-user-pool-client \
  --user-pool-id {pool-id} \
  --client-id {client-id} \
  --region ap-south-1

# Update callback URLs
aws cognito-idp update-user-pool-client \
  --user-pool-id {pool-id} \
  --client-id {client-id} \
  --callback-urls "https://new-url/callback" "http://localhost:4200/callback" \
  --logout-urls "https://new-url/logout" "http://localhost:4200/logout" \
  --region ap-south-1
```

## Cost Optimization

### Free Tier Usage (First 3 Months)

- Lightsail Container (Micro): FREE
- Lightsail Database (Micro): FREE
- CloudFront: 1TB transfer FREE
- S3: 5GB storage FREE

### After Free Tier

- Lightsail Container: $10/month
- Lightsail Database: $15/month
- CloudFront: ~$1-5/month (depends on traffic)
- S3: ~$0.50/month
- **Total: ~$26-30/month**

## Security Best Practices

1. **Rotate JWT Secrets:** Generate new secrets periodically
2. **Enable MFA:** Set `mfa=cognito.Mfa.REQUIRED` for production
3. **Monitor Logs:** Set up CloudWatch alarms
4. **Backup Database:** Enable automated backups
5. **Use HTTPS Only:** Enforce HTTPS for all endpoints
6. **Restrict IAM:** Use least-privilege IAM policies

## Rollback Procedure

If deployment fails:

```powershell
# Rollback to previous container deployment
aws lightsail get-container-service-deployments \
  --service-name veraproof-api-prod \
  --region ap-south-1

# Create deployment with previous image
aws lightsail create-container-service-deployment \
  --service-name veraproof-api-prod \
  --cli-input-json file://previous-deployment.json \
  --region ap-south-1
```

## Support

For issues:
1. Check CloudWatch logs
2. Review SSM parameters
3. Verify stack outputs
4. Test locally first
5. Contact DevOps team

---

**Last Updated:** February 18, 2026  
**Version:** 1.0.0  
**Status:** Production Ready

