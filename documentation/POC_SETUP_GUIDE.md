# VeraProof AI - Production Setup Guide

## 🌐 Domain Configuration

### Do You Need a Domain for Production?

**Answer: NO** - AWS provides default URLs for all services.

### Default URLs Provided by AWS

```yaml
Backend API (Lightsail):
  URL: https://veraproof-api-prod.ap-south-1.cs.amazonlightsail.com
  Cost: $0.00 (included)
  SSL: Automatic (AWS managed)

Partner Dashboard (CloudFront):
  URL: https://d1234567890abc.cloudfront.net
  Cost: $0.00 (included)
  SSL: Automatic (AWS managed)

Verification Interface (CloudFront):
  URL: https://d0987654321xyz.cloudfront.net
  Cost: $0.00 (included)
  SSL: Automatic (AWS managed)

Cognito Auth Domain:
  URL: https://veraproof-auth-prod.auth.ap-south-1.amazoncognito.com
  Cost: $0.00 (included)
  SSL: Automatic (AWS managed)
```

### When You Need a Custom Domain

**Only when:**
- Going to production with customers
- Need branded URLs (e.g., api.veraproof.ai)
- Need custom email domains

**Costs if you add domain later:**
```
Route 53 Hosted Zone: $0.50/month
Domain Registration: $12-15/year (optional)
SSL Certificate (ACM): $0.00 (FREE)
```

### Current Implementation

The CDK stacks have domain configuration but it's **optional**:

```python
# infrastructure/stacks/lightsail_compute_stack.py
public_domain_names=[
    lightsail.CfnContainerService.PublicDomainNameProperty(
        certificate_name=f"veraproof-cert-{stage}",
        domain_names=[f"api-{stage}.veraproof.ai"]
    )
] if stage == "prod" else None,  # Only for prod, not POC
```

**For POC**: This is set to `None`, so no domain is configured.

### Recommendation

✅ **Use AWS default URLs for production**
- No domain purchase needed
- No Route 53 costs
- SSL certificates automatic
- Can add custom domain later without code changes

---

## 🧹 Repository Cleanup

### Files to Remove (Unnecessary for Production)

```bash
# Remove POC-specific documentation (consolidated into main docs)
rm POC_DEPLOYMENT_GUIDE.md
rm AWS_DEPLOYMENT_QUICK_REFERENCE.md
rm DEPLOYMENT_SUMMARY.md

# Keep these essential files:
# - POC_COST_OPTIMIZATION.md (free tier analysis)
# - NETWORKING_COSTS_BREAKDOWN.md (networking costs)
# - FINAL_COST_SUMMARY.md (complete cost summary)
# - LOAD_BALANCER_CLARIFICATION.md (load balancer explanation)
# - POC_SETUP_GUIDE.md (this file)
```

### Cleanup Commands

```bash
# Navigate to project root
cd /path/to/veraproof-ai

# Remove redundant documentation
rm -f POC_DEPLOYMENT_GUIDE.md
rm -f AWS_DEPLOYMENT_QUICK_REFERENCE.md
rm -f DEPLOYMENT_SUMMARY.md

# Remove any backup files
find . -name "*.bak" -delete
find . -name "*~" -delete

# Remove Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete

# Remove Node modules (will reinstall when needed)
# rm -rf partner-dashboard/node_modules

# Remove build artifacts
rm -rf partner-dashboard/dist
rm -rf partner-dashboard/.angular/cache

# Remove CDK output
rm -rf infrastructure/cdk.out
```

---

## 🔐 SSM Parameters Setup

### Required SSM Parameters

#### 1. Database Credentials

**Created automatically by CDK** (via Secrets Manager, then can migrate to SSM):

```bash
# Parameter Name
/veraproof/prod/database/password

# Value (auto-generated)
<random-32-character-password>

# Type
SecureString

# Cost
$0.00 (Standard tier)
```

**How to create manually (if needed):**

```bash
# Generate random password
DB_PASSWORD=$(openssl rand -base64 32)

# Store in SSM Parameter Store
aws ssm put-parameter \
  --name "/veraproof/prod/database/password" \
  --value "$DB_PASSWORD" \
  --type "SecureString" \
  --description "Database password for production" \
  --region ap-south-1
```

#### 2. JWT Secret Key

```bash
# Parameter Name
/veraproof/prod/jwt/secret-key

# Value (generate)
<random-64-character-string>

# Type
SecureString

# Command
JWT_SECRET=$(openssl rand -hex 64)
aws ssm put-parameter \
  --name "/veraproof/prod/jwt/secret-key" \
  --value "$JWT_SECRET" \
  --type "SecureString" \
  --description "JWT secret key for production" \
  --region ap-south-1
```

#### 3. API Keys Salt (for hashing)

```bash
# Parameter Name
/veraproof/prod/api-keys/salt

# Value (generate)
<random-32-character-string>

# Command
API_SALT=$(openssl rand -hex 32)
aws ssm put-parameter \
  --name "/veraproof/prod/api-keys/salt" \
  --value "$API_SALT" \
  --type "SecureString" \
  --description "API keys salt for production" \
  --region ap-south-1
```

#### 4. Webhook Secret (for HMAC signatures)

```bash
# Parameter Name
/veraproof/prod/webhook/secret

# Value (generate)
<random-32-character-string>

# Command
WEBHOOK_SECRET=$(openssl rand -hex 32)
aws ssm put-parameter \
  --name "/veraproof/prod/webhook/secret" \
  --value "$WEBHOOK_SECRET" \
  --type "SecureString" \
  --description "Webhook HMAC secret for production" \
  --region ap-south-1
```

### Complete SSM Setup Script

```bash
#!/bin/bash
# setup-ssm-parameters.sh

STAGE="prod"
REGION="ap-south-1"

echo "Setting up SSM parameters for VeraProof AI Production..."

# 1. Database Password
echo "Creating database password..."
DB_PASSWORD=$(openssl rand -base64 32)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/database/password" \
  --value "$DB_PASSWORD" \
  --type "SecureString" \
  --description "Database password" \
  --region $REGION \
  --overwrite

# 2. JWT Secret
echo "Creating JWT secret..."
JWT_SECRET=$(openssl rand -hex 64)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/jwt/secret-key" \
  --value "$JWT_SECRET" \
  --type "SecureString" \
  --description "JWT secret key" \
  --region $REGION \
  --overwrite

# 3. API Keys Salt
echo "Creating API keys salt..."
API_SALT=$(openssl rand -hex 32)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/api-keys/salt" \
  --value "$API_SALT" \
  --type "SecureString" \
  --description "API keys salt" \
  --region $REGION \
  --overwrite

# 4. Webhook Secret
echo "Creating webhook secret..."
WEBHOOK_SECRET=$(openssl rand -hex 32)
aws ssm put-parameter \
  --name "/veraproof/$STAGE/webhook/secret" \
  --value "$WEBHOOK_SECRET" \
  --type "SecureString" \
  --description "Webhook HMAC secret" \
  --region $REGION \
  --overwrite

echo "✅ All SSM parameters created successfully!"
echo ""
echo "Parameters created:"
echo "  - /veraproof/$STAGE/database/password"
echo "  - /veraproof/$STAGE/jwt/secret-key"
echo "  - /veraproof/$STAGE/api-keys/salt"
echo "  - /veraproof/$STAGE/webhook/secret"
```

### Reading SSM Parameters in Application

```python
# backend/app/config.py
import boto3
from functools import lru_cache

ssm = boto3.client('ssm', region_name='ap-south-1')

@lru_cache()
def get_parameter(name: str) -> str:
    """Get parameter from SSM Parameter Store"""
    response = ssm.get_parameter(
        Name=name,
        WithDecryption=True
    )
    return response['Parameter']['Value']

# Usage
DATABASE_PASSWORD = get_parameter('/veraproof/prod/database/password')
JWT_SECRET = get_parameter('/veraproof/prod/jwt/secret-key')
API_SALT = get_parameter('/veraproof/prod/api-keys/salt')
WEBHOOK_SECRET = get_parameter('/veraproof/prod/webhook/secret')
```

---

## 🚀 GitHub Actions Setup

### Required GitHub Secrets

Navigate to: **GitHub Repository → Settings → Secrets and variables → Actions**

#### 1. AWS Credentials

```yaml
AWS_ACCESS_KEY_ID:
  Description: AWS access key for deployment
  Value: AKIA... (from AWS IAM)
  Required: Yes

AWS_SECRET_ACCESS_KEY:
  Description: AWS secret key for deployment
  Value: <secret-key> (from AWS IAM)
  Required: Yes

AWS_REGION:
  Description: AWS region for deployment
  Value: ap-south-1
  Required: Yes

AWS_ACCOUNT_ID:
  Description: AWS account ID
  Value: 123456789012
  Required: Yes
```

#### 2. Application Secrets

```yaml
DATABASE_URL:
  Description: PostgreSQL connection string
  Value: postgresql://user:pass@host:5432/veraproof
  Required: Yes (for tests)

JWT_SECRET_KEY:
  Description: JWT signing key
  Value: <64-char-hex-string>
  Required: Yes (for tests)
```

### GitHub Actions Workflow Configuration

The workflow is already created at `.github/workflows/ci-cd.yml`. Here's what it does:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run backend tests
      - Run frontend tests
      - Upload coverage reports

  deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - Configure AWS credentials
      - Deploy infrastructure (CDK)
      - Build and push Docker image
      - Deploy to Lightsail
      - Deploy frontend to S3/CloudFront
```

### Setting Up GitHub Secrets

```bash
# Using GitHub CLI (gh)
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY --body "..."
gh secret set AWS_REGION --body "ap-south-1"
gh secret set AWS_ACCOUNT_ID --body "123456789012"
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set JWT_SECRET_KEY --body "..."

# Or manually via GitHub UI:
# 1. Go to repository Settings
# 2. Click "Secrets and variables" → "Actions"
# 3. Click "New repository secret"
# 4. Add each secret
```

### IAM User for GitHub Actions

Create an IAM user with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lightsail:*",
        "rds:*",
        "cognito-idp:*",
        "cloudfront:*",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "iam:*",
        "ec2:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Create IAM user:**

```bash
# Create IAM user
aws iam create-user --user-name github-actions-veraproof

# Attach policy
aws iam attach-user-policy \
  --user-name github-actions-veraproof \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Create access key
aws iam create-access-key --user-name github-actions-veraproof

# Output will show:
# AccessKeyId: AKIA...
# SecretAccessKey: ...
```

---

## 📋 Complete Setup Checklist

### 1. AWS Setup

- [ ] Create AWS account
- [ ] Configure AWS CLI (`aws configure`)
- [ ] Bootstrap CDK (`cdk bootstrap`)
- [ ] Create IAM user for GitHub Actions
- [ ] Set up SSM parameters (run `setup-ssm-parameters.sh`)

### 2. Repository Setup

- [ ] Clone repository
- [ ] Install dependencies (`pip install -r requirements.txt`)
- [ ] Clean up unnecessary files (see cleanup commands above)
- [ ] Review and update `cdk.json` context

### 3. GitHub Actions Setup

- [ ] Add AWS credentials to GitHub Secrets
- [ ] Add application secrets to GitHub Secrets
- [ ] Test workflow by pushing to `develop` branch
- [ ] Verify deployment on merge to `main`

### 4. Deployment

- [ ] Deploy infrastructure: `./deploy.sh poc 123456789012 lightsail`
- [ ] Build and push Docker image to Lightsail
- [ ] Deploy frontend to S3/CloudFront
- [ ] Initialize database schema
- [ ] Test API endpoints
- [ ] Test dashboard login

### 5. Monitoring

- [ ] Set up billing alerts ($5, $10, $20)
- [ ] Monitor free tier usage
- [ ] Enable Cost Explorer
- [ ] Subscribe to SNS alerts

---

## 🎯 Quick Start Commands

```bash
# 1. Setup SSM parameters
chmod +x setup-ssm-parameters.sh
./setup-ssm-parameters.sh

# 2. Deploy infrastructure
cd infrastructure
./deploy.sh prod 123456789012 lightsail

# 3. Build and deploy backend
cd backend
docker build -t veraproof-backend:latest .
aws lightsail push-container-image \
  --service-name veraproof-api-prod \
  --label veraproof-backend \
  --image veraproof-backend:latest \
  --region ap-south-1

# 4. Deploy frontend
cd partner-dashboard
npm run build
aws s3 sync dist/ s3://veraproof-dashboard-prod-<account-id>/

# 5. Test deployment
curl https://veraproof-api-prod.ap-south-1.cs.amazonlightsail.com/health
```

---

## 💡 Summary

### Domain Configuration
- ❌ **Not needed for production**
- ✅ Use AWS default URLs (free, automatic SSL)
- ✅ Can add custom domain later ($0.50/month Route 53)

### SSM Parameters
- ✅ 4 parameters needed (all FREE)
- ✅ Use provided setup script
- ✅ Automatic encryption (SecureString)

### GitHub Actions
- ✅ 6 secrets needed
- ✅ IAM user with PowerUserAccess
- ✅ Workflow already configured

**Total Additional Cost: $0.00** (everything is free!)
