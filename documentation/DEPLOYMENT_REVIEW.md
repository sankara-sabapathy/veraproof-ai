# VeraProof AI - Production Deployment Review

## 🔍 Frontend Deployment Analysis

### ✅ What's Working

1. **S3 Bucket Configuration**
   - ✅ Encryption enabled (S3_MANAGED)
   - ✅ Block all public access (BLOCK_ALL)
   - ✅ Auto-delete objects on stack deletion
   - ✅ Separate buckets for dashboard and verification interface

2. **CloudFront with OAI (Origin Access Identity)**
   - ✅ OAI properly configured for both distributions
   - ✅ S3 buckets grant read access to OAI only
   - ✅ HTTPS redirect enforced (REDIRECT_TO_HTTPS)
   - ✅ Compression enabled
   - ✅ Optimized caching policy
   - ✅ SPA routing configured (404/403 → index.html)
   - ✅ Price class optimized (PRICE_CLASS_100 - cheapest)

3. **Security**
   - ✅ No direct S3 public access
   - ✅ All traffic through CloudFront only
   - ✅ HTTPS enforced
   - ✅ OAI prevents direct S3 URL access

### ❌ CRITICAL ISSUE: Missing CloudFront Distribution ID Output

**Problem:** The frontend stack does NOT export the CloudFront Distribution ID, which is required for cache invalidation after deployment.

**Impact:** 
- GitHub Actions workflow will FAIL when trying to invalidate CloudFront cache
- Users will see stale cached content after deployments
- Manual invalidation required after each deployment

**Current Code (frontend_stack.py):**
```python
# Outputs
CfnOutput(
    self,
    f"Dashboard-URL-{stage}",
    value=f"https://{self.dashboard_distribution.distribution_domain_name}",
    description=f"Dashboard URL for {stage}",
    export_name=f"Veraproof-Dashboard-URL-{stage}"
)
# ❌ Missing Distribution ID output!
```

**GitHub Actions expects:**
```bash
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-${{ steps.stage.outputs.stage }} \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-Distribution-ID-${{ steps.stage.outputs.stage }}`].OutputValue' \
  --output text)
```

### 🔧 Required Fix

Add CloudFront Distribution ID outputs to `infrastructure/stacks/frontend_stack.py`:

```python
# Add after existing outputs
CfnOutput(
    self,
    f"Dashboard-Distribution-ID-{stage}",
    value=self.dashboard_distribution.distribution_id,
    description=f"Dashboard CloudFront Distribution ID for {stage}",
    export_name=f"Veraproof-Dashboard-Distribution-ID-{stage}"
)

CfnOutput(
    self,
    f"Verification-Distribution-ID-{stage}",
    value=self.verification_distribution.distribution_id,
    description=f"Verification CloudFront Distribution ID for {stage}",
    export_name=f"Veraproof-Verification-Distribution-ID-{stage}"
)
```

---

## 📋 Required Parameters for Local Deployment

### 1. AWS Credentials (Session Tokens)

```bash
# Set these environment variables before deployment
export AWS_ACCESS_KEY_ID="ASIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."  # For temporary credentials
export AWS_REGION="ap-south-1"
```

Or configure AWS CLI:
```bash
aws configure set aws_access_key_id ASIA...
aws configure set aws_secret_access_key ...
aws configure set aws_session_token ...
aws configure set region ap-south-1
```

### 2. CDK Deployment Parameters

**Required:**
- `account`: Your AWS Account ID (12 digits)
- `stage`: Environment stage (prod, staging, dev)

**Optional:**
- `compute`: Compute mode (lightsail or fargate) - defaults to lightsail

**Example:**
```bash
cd infrastructure
./deploy.sh 123456789012 lightsail
```

### 3. SSM Parameters (Must be created BEFORE deployment)

These must exist in AWS SSM Parameter Store:

```bash
/veraproof/prod/database/password  (SecureString)
/veraproof/prod/jwt/secret-key     (SecureString)
/veraproof/prod/api-keys/salt      (SecureString)
/veraproof/prod/webhook/secret     (SecureString)
```

**Create using:**
```bash
cd scripts
./setup-ssm-parameters.sh prod ap-south-1
```

### 4. CDK Bootstrap (One-time setup)

```bash
cdk bootstrap aws://123456789012/ap-south-1
```

---

## 🚨 Pre-Deployment Checklist

### AWS Account Setup
- [ ] AWS Account ID confirmed
- [ ] AWS credentials configured (access key, secret key, session token)
- [ ] AWS CLI installed and working (`aws sts get-caller-identity`)
- [ ] Correct region set (ap-south-1)

### CDK Setup
- [ ] Node.js 18+ installed
- [ ] Python 3.12+ installed
- [ ] AWS CDK installed (`npm install -g aws-cdk`)
- [ ] CDK bootstrapped for account/region
- [ ] Python dependencies installed (`pip install -r infrastructure/requirements.txt`)

### SSM Parameters
- [ ] Database password created in SSM
- [ ] JWT secret key created in SSM
- [ ] API keys salt created in SSM
- [ ] Webhook secret created in SSM
- [ ] All parameters in correct region (ap-south-1)

### Docker Setup (for backend deployment)
- [ ] Docker Desktop installed and running
- [ ] Docker daemon accessible

### Frontend Build Tools
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Angular CLI installed (for dashboard)

---

## 🐛 Known Issues & Fixes Required

### 1. ❌ CRITICAL: Missing CloudFront Distribution ID Output
**Status:** Must fix before deployment  
**Impact:** CloudFront cache invalidation will fail  
**Fix:** Add distribution ID outputs to frontend_stack.py (see above)

### 2. ⚠️ GitHub Actions: Missing Distribution ID Query
**Status:** Will fail on first deployment  
**Impact:** Automated deployments won't invalidate cache  
**Fix:** Already configured in workflow, but needs frontend stack fix

### 3. ⚠️ Verification Interface Deployment Missing
**Status:** GitHub Actions only deploys dashboard  
**Impact:** Verification interface won't be deployed automatically  
**Fix:** Add verification interface deployment step to workflow

### 4. ⚠️ Backend Deployment Assumes ECS Fargate
**Status:** GitHub Actions uses ECS commands, but default is Lightsail  
**Impact:** Backend deployment will fail if using Lightsail  
**Fix:** Add conditional logic for Lightsail vs Fargate deployment

---

## 📝 Deployment Order

### Phase 1: Infrastructure (CDK)
```bash
cd infrastructure
./deploy.sh <account_id> lightsail
```

**Creates:**
- VPC, subnets, security groups
- RDS PostgreSQL database
- S3 buckets (artifacts, branding, dashboard, verification)
- CloudFront distributions (dashboard, verification)
- Cognito User Pool
- Lightsail Container Service
- CloudWatch logs and alarms

**Duration:** ~15-20 minutes

### Phase 2: SSM Parameters
```bash
cd scripts
./setup-ssm-parameters.sh prod ap-south-1
```

**Creates:**
- 4 secure parameters in SSM Parameter Store

**Duration:** ~1 minute

### Phase 3: Database Initialization
```bash
# Get database endpoint from CDK outputs
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Database-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Database-Endpoint-prod`].OutputValue' \
  --output text)

# Get password from SSM
DB_PASSWORD=$(aws ssm get-parameter \
  --name /veraproof/prod/database/password \
  --with-decryption \
  --query Parameter.Value \
  --output text)

# Run init script
cd backend
psql -h $DB_ENDPOINT -U veraproof_admin -d veraproof -f db/init.sql
```

**Duration:** ~2 minutes

### Phase 4: Backend Deployment

**For Lightsail:**
```bash
cd backend
docker build -t veraproof-backend:latest .

aws lightsail push-container-image \
  --service-name veraproof-api-prod \
  --label veraproof-backend \
  --image veraproof-backend:latest \
  --region ap-south-1

# Deploy container (requires deployment JSON)
aws lightsail create-container-service-deployment \
  --service-name veraproof-api-prod \
  --region ap-south-1 \
  --containers file://lightsail-containers.json \
  --public-endpoint file://lightsail-public-endpoint.json
```

**For ECS Fargate:**
```bash
cd backend
docker build -t veraproof-backend:latest .

# Get ECR URI from CDK outputs
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Compute-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ECR-Repository-URI-prod`].OutputValue' \
  --output text)

# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Tag and push
docker tag veraproof-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest

# Force new deployment
aws ecs update-service \
  --cluster veraproof-cluster-prod \
  --service veraproof-api-prod \
  --force-new-deployment \
  --region ap-south-1
```

**Duration:** ~10-15 minutes

### Phase 5: Frontend Deployment

**Dashboard:**
```bash
cd partner-dashboard
npm install
npm run build -- --configuration=prod

# Get bucket name from CDK outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-Bucket-Name-prod`].OutputValue' \
  --output text)

# Deploy to S3
aws s3 sync dist/partner-dashboard s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache (REQUIRES FIX ABOVE)
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-Distribution-ID-prod`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*" \
  --region ap-south-1
```

**Verification Interface:**
```bash
cd verification-interface

# Get bucket name from CDK outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Verification-Bucket-Name-prod`].OutputValue' \
  --output text)

# Deploy to S3
aws s3 sync . s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache (REQUIRES FIX ABOVE)
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Verification-Distribution-ID-prod`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*" \
  --region ap-south-1
```

**Duration:** ~5-10 minutes

---

## 🧪 Post-Deployment Verification

### 1. Test API Health
```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Lightsail-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Lightsail-API-URL-prod`].OutputValue' \
  --output text)

curl $API_URL/health
# Expected: {"status":"healthy"}
```

### 2. Test Dashboard
```bash
DASHBOARD_URL=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-URL-prod`].OutputValue' \
  --output text)

echo "Dashboard: $DASHBOARD_URL"
# Open in browser and verify login page loads
```

### 3. Test Verification Interface
```bash
VERIFICATION_URL=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Verification-URL-prod`].OutputValue' \
  --output text)

echo "Verification: $VERIFICATION_URL"
# Open in browser and verify interface loads
```

### 4. Test Database Connection
```bash
# From backend container or local with VPN
psql -h $DB_ENDPOINT -U veraproof_admin -d veraproof -c "SELECT version();"
```

### 5. Test S3 Access
```bash
# Verify buckets exist
aws s3 ls | grep veraproof

# Verify CloudFront serves content (not direct S3)
curl -I $DASHBOARD_URL
# Should show CloudFront headers, not S3
```

---

## 💰 Cost Monitoring

### Set Up Billing Alerts
```bash
# Create SNS topic for alerts
aws sns create-topic --name veraproof-billing-alerts --region ap-south-1

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-south-1:123456789012:veraproof-billing-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name veraproof-billing-5usd \
  --alarm-description "Alert when bill exceeds $5" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-south-1:123456789012:veraproof-billing-alerts
```

### Monitor Free Tier Usage
- Go to AWS Billing Console → Free Tier
- Check usage weekly during first 3 months
- Set up alerts at 80% of free tier limits

---

## 🔒 Security Checklist

- [ ] S3 buckets have no public access
- [ ] CloudFront uses OAI (not public S3 URLs)
- [ ] HTTPS enforced on all endpoints
- [ ] Database in private subnet
- [ ] Security groups properly configured
- [ ] SSM parameters use SecureString encryption
- [ ] IAM roles follow least privilege principle
- [ ] CloudWatch logs enabled for audit trail
- [ ] No hardcoded secrets in code
- [ ] API keys rotated regularly

---

## 📞 Troubleshooting

### CDK Deployment Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check CDK bootstrap
cdk bootstrap aws://123456789012/ap-south-1

# Check for existing stacks
aws cloudformation list-stacks --region ap-south-1
```

### Docker Push Fails
```bash
# Check Docker is running
docker ps

# Check Lightsail service exists
aws lightsail get-container-services --region ap-south-1

# Check ECR repository exists
aws ecr describe-repositories --region ap-south-1
```

### CloudFront Invalidation Fails
```bash
# Check distribution exists
aws cloudfront list-distributions --region ap-south-1

# Manual invalidation
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Database Connection Fails
```bash
# Check RDS instance status
aws rds describe-db-instances --region ap-south-1

# Check security group allows connections
aws ec2 describe-security-groups --region ap-south-1

# Test from EC2 instance in same VPC
psql -h $DB_ENDPOINT -U veraproof_admin -d veraproof
```

---

## 📚 Next Steps After Deployment

1. **Configure Custom Domain** (optional)
   - Purchase domain in Route 53
   - Create SSL certificate in ACM
   - Update CloudFront distributions
   - Update Cognito domain

2. **Set Up Monitoring**
   - Configure CloudWatch dashboards
   - Set up SNS alerts
   - Enable X-Ray tracing (if needed)

3. **Configure Backups**
   - Enable RDS automated backups
   - Configure S3 versioning
   - Set up cross-region replication (if needed)

4. **Performance Optimization**
   - Review CloudFront cache hit ratio
   - Optimize database queries
   - Enable CloudFront compression

5. **Security Hardening**
   - Enable AWS WAF (if needed)
   - Configure AWS Shield
   - Set up AWS GuardDuty
   - Enable CloudTrail logging

---

## ✅ Summary

**Frontend Deployment:**
- ✅ S3 + CloudFront properly configured
- ✅ OAI security implemented
- ✅ HTTPS enforced
- ✅ Auto-invalidation configured in GitHub Actions
- ❌ **CRITICAL FIX REQUIRED:** Add CloudFront Distribution ID outputs

**Required Parameters for Local Deployment:**
1. AWS credentials (access key, secret key, session token)
2. AWS Account ID
3. SSM parameters (4 secure strings)
4. CDK bootstrap completed

**Deployment Duration:** ~30-40 minutes total

**Estimated Cost:** $0/month (first 3 months), then $7/month
