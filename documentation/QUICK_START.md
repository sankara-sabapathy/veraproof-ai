# VeraProof AI - Quick Start Guide

## 🎯 Production Deployment in 5 Steps

**Total Time**: ~30 minutes  
**Total Cost**: $0/month (first 3 months), then $7/month

---

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Docker Desktop
- Node.js 18+
- Python 3.12+

---

## Step 1: Setup SSM Parameters (2 minutes)

```bash
# Linux/Mac
cd scripts
chmod +x setup-ssm-parameters.sh
./setup-ssm-parameters.sh prod ap-south-1

# Windows PowerShell
cd scripts
.\setup-ssm-parameters.ps1 -Stage prod -Region ap-south-1
```

**What this does:**
- Creates 4 secure parameters in AWS SSM
- Generates random secrets for database, JWT, API keys, webhooks
- **Cost**: $0.00 (SSM Standard tier is FREE)

---

## Step 2: Deploy Infrastructure (15 minutes)

```bash
# Linux/Mac
cd infrastructure
./deploy.sh prod 123456789012 lightsail

# Windows PowerShell
cd infrastructure
.\deploy.ps1 -Stage prod -Account 123456789012 -ComputeMode lightsail
```

**What this creates:**
- Lightsail Container (Nano) - FREE for 3 months
- RDS PostgreSQL (t3.micro) - FREE for 12 months
- S3 Buckets - FREE for 12 months
- CloudFront Distributions - FREE for 12 months
- Cognito User Pool - FREE always
- CloudWatch Monitoring - FREE always

**Cost**: $0.00/month (first 3 months)

---

## Step 3: Deploy Backend (5 minutes)

```bash
cd backend

# Build Docker image
docker build -t veraproof-backend:latest .

# Push to Lightsail
aws lightsail push-container-image \
  --service-name veraproof-api-prod \
  --label veraproof-backend \
  --image veraproof-backend:latest \
  --region ap-south-1

# Deploy container
aws lightsail create-container-service-deployment \
  --service-name veraproof-api-prod \
  --region ap-south-1 \
  --containers file://lightsail-containers.json \
  --public-endpoint file://lightsail-public-endpoint.json
```

---

## Step 4: Deploy Frontend (5 minutes)

```bash
# Get S3 bucket names from CDK outputs
DASHBOARD_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-Bucket-Name-prod`].OutputValue' \
  --output text)

# Build dashboard
cd partner-dashboard
npm install
npm run build

# Deploy to S3
aws s3 sync dist/partner-dashboard s3://$DASHBOARD_BUCKET/ --delete

# Deploy verification interface
cd ../verification-interface
aws s3 sync . s3://$VERIFICATION_BUCKET/ --delete
```

---

## Step 5: Initialize Database (3 minutes)

```bash
# Get database endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Database-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Database-Endpoint-prod`].OutputValue' \
  --output text)

# Get database password from SSM
DB_PASSWORD=$(aws ssm get-parameter \
  --name /veraproof/prod/database/password \
  --with-decryption \
  --query Parameter.Value \
  --output text)

# Run init script
cd backend
psql -h $DB_ENDPOINT -U veraproof_admin -d veraproof -f db/init.sql
```

---

## ✅ Verify Deployment

### Test API

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Lightsail-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Lightsail-API-URL-prod`].OutputValue' \
  --output text)

# Test health endpoint
curl $API_URL/health

# Expected: {"status":"healthy"}
```

### Test Dashboard

```bash
# Get dashboard URL
DASHBOARD_URL=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-URL-prod`].OutputValue' \
  --output text)

echo "Dashboard: $DASHBOARD_URL"
# Open in browser
```

---

## 📊 Your Production URLs

All URLs are provided by AWS (no domain purchase needed):

```yaml
Backend API:
  https://veraproof-api-prod.ap-south-1.cs.amazonlightsail.com
  
Partner Dashboard:
  https://d1234567890abc.cloudfront.net
  
Verification Interface:
  https://d0987654321xyz.cloudfront.net
  
Cognito Auth:
  https://veraproof-auth-prod.auth.ap-south-1.amazoncognito.com
```

---

## 💰 Cost Breakdown

| Period | Monthly Cost | What's Paid |
|--------|-------------|-------------|
| **Months 1-3** | **$0.00** | Everything FREE |
| **Months 4-12** | **$7.00** | Lightsail Container only |
| **Month 13+** | **$32.00** | Lightsail + RDS + S3/CloudFront |

**Year 1 Total**: $63.00

---

## 🔧 Configuration Files

### SSM Parameters (Created in Step 1)

```
/veraproof/prod/database/password  (SecureString)
/veraproof/prod/jwt/secret-key     (SecureString)
/veraproof/prod/api-keys/salt      (SecureString)
/veraproof/prod/webhook/secret     (SecureString)
```

### GitHub Secrets (For CI/CD)

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION (ap-south-1)
AWS_ACCOUNT_ID
DATABASE_URL
JWT_SECRET_KEY
```

---

## 📚 Documentation

- **[POC_SETUP_GUIDE.md](./POC_SETUP_GUIDE.md)** - Complete setup guide with domain, SSM, GitHub Actions
- **[FINAL_COST_SUMMARY.md](./FINAL_COST_SUMMARY.md)** - Detailed cost breakdown by service
- **[NETWORKING_COSTS_BREAKDOWN.md](./NETWORKING_COSTS_BREAKDOWN.md)** - Complete networking costs
- **[POC_COST_OPTIMIZATION.md](./POC_COST_OPTIMIZATION.md)** - Free tier optimization strategies
- **[LOAD_BALANCER_CLARIFICATION.md](./LOAD_BALANCER_CLARIFICATION.md)** - Load balancer usage explained

---

## 🚨 Important Notes

### No Domain Required
- ✅ AWS provides default URLs for all services
- ✅ SSL certificates are automatic
- ✅ Can add custom domain later ($0.50/month)

### Free Tier Monitoring
- Set up billing alerts at $5, $10, $20
- Monitor free tier usage weekly
- Enable AWS Cost Explorer

### Networking Costs
- ✅ All networking is FREE for POC
- ✅ No NAT Gateway ($0 vs $37/month)
- ✅ No VPC Endpoints ($0 vs $23/month)
- ✅ Lightsail includes 1TB data transfer
- ✅ First 100GB AWS data transfer is FREE

---

## 🎉 Success!

Your production environment is now running for **FREE** for the next 3 months!

**What you have:**
- ✅ Backend API (FastAPI + OpenCV)
- ✅ Partner Dashboard (Angular)
- ✅ Verification Interface (Vanilla JS)
- ✅ Database (PostgreSQL)
- ✅ Authentication (Cognito)
- ✅ Storage (S3)
- ✅ CDN (CloudFront)
- ✅ Monitoring (CloudWatch)

**Total Cost**: $0.00/month (months 1-3)

---

## 🆘 Troubleshooting

### CDK Deployment Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Bootstrap CDK
cdk bootstrap aws://123456789012/ap-south-1
```

### Docker Push Fails
```bash
# Check Lightsail service exists
aws lightsail get-container-services --region ap-south-1

# Verify Docker is running
docker ps
```

### Database Connection Fails
```bash
# Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier veraproof-db-prod \
  --region ap-south-1

# Verify security group allows connections
```

---

## 📞 Support

- **Documentation**: See `documentation/` folder
- **Issues**: Check GitHub Issues
- **Email**: engineering@veraproof.ai
