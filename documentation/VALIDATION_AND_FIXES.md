# VeraProof AI - Validation & Fixes

## 🎉 Deployment Complete!

All 4 CDK stacks deployed successfully:
- ✅ Storage Stack
- ✅ Auth Stack  
- ✅ Frontend Stack
- ✅ Lightsail Stack

## 📊 Deployed Resources

### Lightsail API
- **URL**: `https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/`
- **Service Name**: `veraproof-api-prod`
- **Status**: ❌ 404 - No container deployed yet

### Frontend URLs
- **Dashboard**: `https://d3gc0en9my7apv.cloudfront.net`
  - **Status**: ❌ 404 - S3 bucket empty
- **Verification**: `https://dmieqia655oqd.cloudfront.net`
  - **Status**: ❌ 404 - S3 bucket empty

### Database
- **Name**: `veraproof-db-prod`
- **ARN**: `arn:aws:lightsail:ap-south-1:612850243659:RelationalDatabase/ddf73465-c903-44e2-a949-8c3143c351db`
- **Port**: `5432`
- **Status**: ✅ Created (need to retrieve password)

## 🔧 Root Causes & Fixes

### Issue 1: Lightsail API Returns 404

**Root Cause**: The Lightsail Container Service is created but has no deployment. CDK creates the service infrastructure, but you need to deploy your Docker container.

**Fix Steps**:

1. **Renew AWS Credentials** (they expired):
   ```bash
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   export AWS_SESSION_TOKEN=...
   ```

2. **Get Database Password**:
   ```bash
   aws lightsail get-relational-database-master-user-password \
     --relational-database-name veraproof-db-prod \
     --region ap-south-1
   ```

3. **Get Database Endpoint**:
   ```bash
   aws lightsail get-relational-database \
     --relational-database-name veraproof-db-prod \
     --region ap-south-1 \
     --query 'relationalDatabase.masterEndpoint'
   ```

4. **Build Backend Docker Image**:
   ```bash
   cd backend
   docker build -t veraproof-api:latest .
   ```

5. **Push to Lightsail**:
   ```bash
   aws lightsail push-container-image \
     --service-name veraproof-api-prod \
     --label veraproof-api \
     --image veraproof-api:latest \
     --region ap-south-1
   ```
   
   Note the image name from output (e.g., `:veraproof-api-prod.veraproof-api.1`)

6. **Create Deployment Configuration** (`deployment.json`):
   ```json
   {
     "containers": {
       "app": {
         "image": ":veraproof-api-prod.veraproof-api.1",
         "ports": {
           "8000": "HTTP"
         },
         "environment": {
           "STAGE": "prod",
           "AWS_REGION": "ap-south-1",
           "DATABASE_URL": "postgresql://veraproof_admin:PASSWORD@ENDPOINT:5432/veraproof",
           "COGNITO_USER_POOL_ID": "ap-south-1_l4nlq0n8y",
           "COGNITO_CLIENT_ID": "2b7tq4gj7426iamis9snrrh2fo",
           "ARTIFACTS_BUCKET": "veraproof-artifacts-prod-612850243659",
           "BRANDING_BUCKET": "veraproof-branding-prod-612850243659"
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

7. **Deploy Container**:
   ```bash
   aws lightsail create-container-service-deployment \
     --service-name veraproof-api-prod \
     --cli-input-json file://deployment.json \
     --region ap-south-1
   ```

8. **Monitor Deployment**:
   ```bash
   aws lightsail get-container-services \
     --service-name veraproof-api-prod \
     --region ap-south-1 \
     --query 'containerServices[0].currentDeployment.state'
   ```

9. **Test API** (once deployment is ACTIVE):
   ```bash
   curl https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/health
   ```

### Issue 2: CloudFront Dashboard Returns 404

**Root Cause**: S3 bucket `veraproof-dashboard-prod-612850243659` is empty. No frontend files uploaded.

**Fix Steps**:

1. **Build Dashboard**:
   ```bash
   cd partner-dashboard
   npm install
   npm run build
   ```

2. **Upload to S3**:
   ```bash
   aws s3 sync dist/ s3://veraproof-dashboard-prod-612850243659/ --delete
   ```

3. **Invalidate CloudFront Cache**:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E22HOO32XSEYNN \
     --paths "/*"
   ```

4. **Test Dashboard**:
   ```bash
   curl -I https://d3gc0en9my7apv.cloudfront.net
   ```

### Issue 3: CloudFront Verification Page Returns 404

**Root Cause**: S3 bucket `veraproof-verification-prod-612850243659` is empty. No verification page uploaded.

**Fix Steps**:

1. **Prepare Verification Page** (if not already built):
   ```bash
   # Ensure verification page files are ready
   cd verification-page
   ```

2. **Upload to S3**:
   ```bash
   aws s3 sync . s3://veraproof-verification-prod-612850243659/ --delete
   ```

3. **Invalidate CloudFront Cache**:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E3A2H3IT5ET3I0 \
     --paths "/*"
   ```

4. **Test Verification Page**:
   ```bash
   curl -I https://dmieqia655oqd.cloudfront.net
   ```

## 🚀 Quick Fix Script

Create a file `deploy-all.sh`:

```bash
#!/bin/bash
set -e

echo "=== Deploying VeraProof AI ==="

# 1. Get database info
echo "Getting database information..."
DB_PASSWORD=$(aws lightsail get-relational-database-master-user-password \
  --relational-database-name veraproof-db-prod \
  --region ap-south-1 \
  --query 'masterUserPassword' \
  --output text)

DB_ENDPOINT=$(aws lightsail get-relational-database \
  --relational-database-name veraproof-db-prod \
  --region ap-south-1 \
  --query 'relationalDatabase.masterEndpoint.address' \
  --output text)

echo "Database Endpoint: $DB_ENDPOINT"

# 2. Build and deploy backend
echo "Building backend..."
cd backend
docker build -t veraproof-api:latest .

echo "Pushing to Lightsail..."
aws lightsail push-container-image \
  --service-name veraproof-api-prod \
  --label veraproof-api \
  --image veraproof-api:latest \
  --region ap-south-1

# Update deployment.json with actual values
cat > deployment.json <<EOF
{
  "containers": {
    "app": {
      "image": ":veraproof-api-prod.veraproof-api.1",
      "ports": {
        "8000": "HTTP"
      },
      "environment": {
        "STAGE": "prod",
        "AWS_REGION": "ap-south-1",
        "DATABASE_URL": "postgresql://veraproof_admin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/veraproof",
        "COGNITO_USER_POOL_ID": "ap-south-1_l4nlq0n8y",
        "COGNITO_CLIENT_ID": "2b7tq4gj7426iamis9snrrh2fo",
        "ARTIFACTS_BUCKET": "veraproof-artifacts-prod-612850243659",
        "BRANDING_BUCKET": "veraproof-branding-prod-612850243659"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "app",
    "containerPort": 8000,
    "healthCheck": {
      "path": "/health",
      "intervalSeconds": 30
    }
  }
}
EOF

echo "Deploying container..."
aws lightsail create-container-service-deployment \
  --service-name veraproof-api-prod \
  --cli-input-json file://deployment.json \
  --region ap-south-1

cd ..

# 3. Deploy dashboard
echo "Building dashboard..."
cd partner-dashboard
npm install
npm run build

echo "Uploading dashboard..."
aws s3 sync dist/ s3://veraproof-dashboard-prod-612850243659/ --delete

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id E22HOO32XSEYNN \
  --paths "/*"

cd ..

# 4. Deploy verification page
echo "Uploading verification page..."
aws s3 sync verification-page/ s3://veraproof-verification-prod-612850243659/ --delete

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id E3A2H3IT5ET3I0 \
  --paths "/*"

echo ""
echo "=== Deployment Complete ==="
echo "API: https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/"
echo "Dashboard: https://d3gc0en9my7apv.cloudfront.net"
echo "Verification: https://dmieqia655oqd.cloudfront.net"
echo ""
echo "Wait 2-3 minutes for container deployment to complete."
```

Make it executable and run:
```bash
chmod +x deploy-all.sh
./deploy-all.sh
```

## ✅ Validation Checklist

After running the fixes:

- [ ] Renew AWS credentials
- [ ] Retrieve database password
- [ ] Build backend Docker image
- [ ] Push image to Lightsail
- [ ] Deploy container to Lightsail
- [ ] Wait for deployment to be ACTIVE (2-3 minutes)
- [ ] Test API health endpoint
- [ ] Build dashboard frontend
- [ ] Upload dashboard to S3
- [ ] Invalidate dashboard CloudFront cache
- [ ] Test dashboard URL
- [ ] Upload verification page to S3
- [ ] Invalidate verification CloudFront cache
- [ ] Test verification URL
- [ ] Test end-to-end flow

## 🔍 Troubleshooting

### Container Deployment Fails
- Check CloudWatch logs: `/aws/lightsail/veraproof-api-prod`
- Verify environment variables in deployment.json
- Check database connectivity

### Frontend Still Shows 404
- Wait 5-10 minutes for CloudFront cache invalidation
- Check S3 bucket has files: `aws s3 ls s3://BUCKET_NAME/`
- Verify CloudFront distribution is enabled

### Database Connection Issues
- Verify password is correct
- Check database state: `aws lightsail get-relational-database --relational-database-name veraproof-db-prod`
- Ensure database is in "available" state

## 📊 Expected Results

After all fixes:

1. **API Health Check**: Returns 200 OK with health status
2. **Dashboard**: Loads login page
3. **Verification**: Loads verification interface
4. **Database**: Accepts connections from container

## 🎯 Next Steps

Once all endpoints are working:
1. Test user registration/login
2. Test video verification flow
3. Verify sensor fusion processing
4. Check database for stored sessions
5. Monitor CloudWatch logs
6. Set up alerts for errors
