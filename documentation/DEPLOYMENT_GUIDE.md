# VeraProof AI - Deployment Guide

## Overview

This guide covers deploying VeraProof AI to AWS using CDK in the ap-south-1 (Mumbai) region with enterprise-grade naming conventions and best practices.

**Deployment Options:**
1. **AWS Lightsail** (Default) - Cost-effective, simple, predictable pricing (~$765/month all stages)
2. **ECS Fargate** - Enterprise-grade, auto-scaling, advanced features (~$982/month all stages)

See [AWS Resources and Costs](./AWS_RESOURCES_AND_COSTS.md) for detailed comparison.

## Prerequisites

### Required Tools
- AWS CLI v2
- AWS CDK CLI v2.120.0+
- Python 3.12+
- Docker Desktop
- Node.js 18+
- Git

### AWS Account Setup
- AWS Account with admin access
- AWS CLI configured with credentials
- CDK bootstrapped in ap-south-1

## Deployment Stages

### Development (dev)
- **Purpose**: Local testing and development
- **Resources**: Minimal (Lightsail Nano or t3.micro, single AZ)
- **Cost**: ~$28/month (Lightsail) or ~$54/month (Fargate)
- **Data**: Not persistent, can be destroyed

### Staging (staging)
- **Purpose**: Pre-production testing
- **Resources**: Medium (Lightsail Micro or t3.small, single AZ)
- **Cost**: ~$62/month (Lightsail) or ~$134/month (Fargate)
- **Data**: 7-day retention

### Production (prod)
- **Purpose**: Live customer traffic
- **Resources**: High availability (Lightsail Small x2 or multi-AZ auto-scaling)
- **Cost**: ~$675/month (Lightsail) or ~$795/month (Fargate)
- **Data**: 30-day retention, deletion protection

## Pre-Deployment Checklist

### 1. AWS Account Configuration

```bash
# Configure AWS CLI
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: ap-south-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### 2. Install CDK

```bash
# Install CDK CLI
npm install -g aws-cdk

# Verify installation
cdk --version
```

### 3. Bootstrap CDK

```bash
# Bootstrap for development
cdk bootstrap aws://ACCOUNT_ID/ap-south-1

# The bootstrap stack creates:
# - S3 bucket for CDK assets
# - ECR repository for Docker images
# - IAM roles for CloudFormation
```

### 4. Configure Context

Edit `infrastructure/cdk.json` and add:

```json
{
  "context": {
    "stage": "dev",
    "compute": "lightsail",
    "account": "123456789012",
    "alert_email": "alerts@yourcompany.com"
  }
}
```

**Compute Options:**
- `"lightsail"` - AWS Lightsail Container Service (default, cost-effective)
- `"fargate"` - AWS ECS Fargate (enterprise-grade, auto-scaling)

## Deployment Steps

### Choose Your Deployment Mode

#### Option A: Lightsail Deployment (Recommended for MVP)

**Pros:**
- Fixed, predictable pricing
- Simple management
- Perfect for startups and MVPs
- Original spec requirement

**Cons:**
- Limited to 2 nodes max
- No advanced auto-scaling
- Fewer monitoring features

```bash
cd infrastructure

# Deploy with Lightsail
./deploy.sh dev 123456789012 lightsail
```

#### Option B: ECS Fargate Deployment (Enterprise-Grade)

**Pros:**
- Auto-scaling (2-10+ tasks)
- Advanced monitoring
- Blue/green deployments
- Service mesh ready

**Cons:**
- Higher costs
- More complex
- Pay-per-use pricing

```bash
cd infrastructure

# Deploy with ECS Fargate
./deploy.sh dev 123456789012 fargate
```

### Step 1: Deploy Infrastructure

```bash
cd infrastructure

# Install Python dependencies
pip install -r requirements.txt

# Synthesize CloudFormation templates
cdk synth --context stage=dev --context compute=lightsail --context account=123456789012

# Deploy all stacks (Lightsail mode)
./deploy.sh dev 123456789012 lightsail

# OR deploy with ECS Fargate
./deploy.sh dev 123456789012 fargate
```

**Deployment Order:**
1. Network Stack (VPC, subnets, security groups)
2. Database Stack (RDS PostgreSQL)
3. Storage Stack (S3 buckets)
4. Auth Stack (Cognito)
5. Compute Stack (Lightsail Container OR ECS Fargate)
6. Frontend Stack (CloudFront + S3)
7. Monitoring Stack (CloudWatch)

**Expected Duration**: 15-20 minutes

### Step 2: Build and Push Docker Image

#### For Lightsail Deployment

```bash
# Build Docker image
cd backend
docker build -t veraproof-backend:latest .

# Push to Lightsail (Lightsail uses its own container registry)
# Get service name from CDK output
SERVICE_NAME=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Lightsail-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`Lightsail-Service-Name-dev`].OutputValue' \
  --output text)

# Push container image to Lightsail
aws lightsail push-container-image \
  --service-name $SERVICE_NAME \
  --label veraproof-backend \
  --image veraproof-backend:latest \
  --region ap-south-1

# Deploy container to Lightsail
aws lightsail create-container-service-deployment \
  --service-name $SERVICE_NAME \
  --containers file://lightsail-containers.json \
  --public-endpoint file://lightsail-public-endpoint.json \
  --region ap-south-1
```

#### For ECS Fargate Deployment

```bash
# Get ECR repository URI from CDK output
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Compute-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ECR-Repository-URI-dev`].OutputValue' \
  --output text)

# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
cd backend
docker build -t veraproof-backend:latest .

# Tag image
docker tag veraproof-backend:latest $ECR_URI:latest

# Push to ECR
docker push $ECR_URI:latest
```

### Step 3: Deploy Backend Service

```bash
# Update ECS service to use new image
aws ecs update-service \
  --cluster veraproof-cluster-dev \
  --service veraproof-api-dev \
  --force-new-deployment \
  --region ap-south-1

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster veraproof-cluster-dev \
  --services veraproof-api-dev \
  --region ap-south-1
```

### Step 4: Deploy Frontend Assets

```bash
# Get S3 bucket names from CDK output
DASHBOARD_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-Bucket-Name-dev`].OutputValue' \
  --output text)

VERIFICATION_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`Verification-Bucket-Name-dev`].OutputValue' \
  --output text)

# Build dashboard
cd partner-dashboard
npm run build

# Deploy dashboard to S3
aws s3 sync dist/partner-dashboard s3://$DASHBOARD_BUCKET/ --delete

# Deploy verification interface
cd ../verification-interface
aws s3 sync . s3://$VERIFICATION_BUCKET/ --delete

# Invalidate CloudFront cache
DASHBOARD_DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-Distribution-ID-dev`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DASHBOARD_DIST_ID \
  --paths "/*"
```

### Step 5: Initialize Database

```bash
# Get database endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Database-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`Database-Endpoint-dev`].OutputValue' \
  --output text)

# Get database credentials from Secrets Manager
DB_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Database-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`Database-Secret-ARN-dev`].OutputValue' \
  --output text)

DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
  --secret-id $DB_SECRET_ARN \
  --query SecretString \
  --output text)

# Connect and run init script
psql -h $DB_ENDPOINT -U veraproof_admin -d veraproof -f backend/db/init.sql
```

### Step 6: Verify Deployment

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Compute-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`API-URL-dev`].OutputValue' \
  --output text)

# Test health endpoint
curl $API_URL/health

# Expected response: {"status":"healthy"}

# Get dashboard URL
DASHBOARD_URL=$(aws cloudformation describe-stacks \
  --stack-name Veraproof-Frontend-Stack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`Dashboard-URL-dev`].OutputValue' \
  --output text)

echo "Dashboard URL: $DASHBOARD_URL"
```

## Post-Deployment Configuration

### 1. Configure DNS (Optional)

```bash
# Create Route53 hosted zone
aws route53 create-hosted-zone \
  --name veraproof.ai \
  --caller-reference $(date +%s)

# Create A record for dashboard
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://dns-records.json
```

### 2. Configure SSL Certificates

```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name dashboard-dev.veraproof.ai \
  --validation-method DNS \
  --region ap-south-1

# Validate certificate (follow email instructions)
```

### 3. Configure Monitoring

```bash
# Subscribe to SNS alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-south-1:ACCOUNT_ID:veraproof-alerts-dev \
  --protocol email \
  --notification-endpoint alerts@yourcompany.com
```

### 4. Configure Backup

```bash
# Enable automated RDS snapshots (already configured in CDK)
# Verify backup retention
aws rds describe-db-instances \
  --db-instance-identifier veraproof-db-dev \
  --query 'DBInstances[0].BackupRetentionPeriod'
```

## Environment-Specific Configurations

### Development

```bash
# Deploy with minimal resources
./deploy.sh dev 123456789012

# Features:
# - Single AZ
# - t3.micro instances
# - 1-day backup retention
# - Public subnets (no NAT)
# - HTTP allowed
```

### Staging

```bash
# Deploy with medium resources
./deploy.sh staging 123456789012

# Features:
# - Single AZ
# - t3.small instances
# - 7-day backup retention
# - Public subnets
# - HTTPS enforced
```

### Production

```bash
# Deploy with high availability
./deploy.sh prod 123456789012

# Features:
# - Multi-AZ
# - m5.large instances
# - 30-day backup retention
# - Private subnets with NAT
# - HTTPS enforced
# - MFA enabled
# - Enhanced monitoring
# - Deletion protection
```

## Rollback Procedures

### Rollback Infrastructure

```bash
# Rollback to previous stack version
cdk deploy --rollback \
  --context stage=dev \
  --context account=123456789012
```

### Rollback Application

```bash
# Revert to previous Docker image
aws ecs update-service \
  --cluster veraproof-cluster-dev \
  --service veraproof-api-dev \
  --task-definition veraproof-backend-dev:PREVIOUS_REVISION \
  --force-new-deployment
```

### Rollback Frontend

```bash
# Restore from S3 versioning
aws s3api list-object-versions \
  --bucket $DASHBOARD_BUCKET \
  --prefix index.html

aws s3api copy-object \
  --bucket $DASHBOARD_BUCKET \
  --copy-source $DASHBOARD_BUCKET/index.html?versionId=VERSION_ID \
  --key index.html
```

## Disaster Recovery

### Database Backup

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier veraproof-db-prod \
  --db-snapshot-identifier veraproof-manual-backup-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier veraproof-db-prod-restored \
  --db-snapshot-identifier veraproof-manual-backup-20260218
```

### S3 Backup

```bash
# Enable versioning (already configured)
# Enable cross-region replication for production

aws s3api put-bucket-replication \
  --bucket veraproof-artifacts-prod \
  --replication-configuration file://replication-config.json
```

## Monitoring and Alerts

### CloudWatch Dashboard

Access: https://console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards:name=Veraproof-Metrics-dev

**Metrics:**
- API error rate
- API latency (sub-3s requirement)
- Database CPU utilization
- Database connections
- ECS task count
- S3 storage usage

### SNS Alerts

**Configured Alarms:**
- High API error rate (> 10 errors/5min)
- High API latency (> 3 seconds)
- High database CPU (> 80%)
- High database connections (> 80)

## Cost Management

### Cost Estimation

**Development**: ~$50-100/month
- RDS t3.micro: $15
- ECS Fargate: $20
- S3: $5
- CloudFront: $10
- Other: $10

**Production**: ~$500-1000/month
- RDS m5.large (Multi-AZ): $200
- ECS Fargate (2-10 tasks): $150-400
- S3: $50
- CloudFront: $50
- NAT Gateway: $50
- Other: $50

### Cost Optimization

```bash
# Enable cost allocation tags
aws ce create-cost-category-definition \
  --name VeraProof \
  --rules file://cost-rules.json

# Set up budget alerts
aws budgets create-budget \
  --account-id ACCOUNT_ID \
  --budget file://budget.json
```

## Troubleshooting

### ECS Task Fails to Start

```bash
# Check task logs
aws logs tail /ecs/veraproof-backend-dev --follow

# Check task definition
aws ecs describe-task-definition \
  --task-definition veraproof-backend-dev

# Check service events
aws ecs describe-services \
  --cluster veraproof-cluster-dev \
  --services veraproof-api-dev
```

### Database Connection Issues

```bash
# Check security group rules
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx

# Test connection from ECS task
aws ecs execute-command \
  --cluster veraproof-cluster-dev \
  --task TASK_ID \
  --container veraproof-backend-dev \
  --interactive \
  --command "/bin/bash"

# Inside container:
psql -h $DB_ENDPOINT -U veraproof_admin -d veraproof
```

### CloudFront Not Serving Content

```bash
# Check origin configuration
aws cloudfront get-distribution \
  --id DISTRIBUTION_ID

# Check S3 bucket policy
aws s3api get-bucket-policy \
  --bucket $DASHBOARD_BUCKET

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## Security Best Practices

1. **Rotate Credentials**: Rotate database passwords every 90 days
2. **Enable MFA**: Enable MFA for production Cognito
3. **Review IAM Policies**: Regularly audit IAM roles and policies
4. **Enable CloudTrail**: Enable CloudTrail for audit logging
5. **Enable GuardDuty**: Enable GuardDuty for threat detection
6. **Patch Management**: Keep all dependencies up to date
7. **Secrets Management**: Use Secrets Manager for all credentials
8. **Network Isolation**: Use private subnets for production

## Compliance

### SOC2 Requirements

- [x] Encryption at rest (S3, RDS)
- [x] Encryption in transit (HTTPS, TLS)
- [x] Access logging (CloudTrail)
- [x] Monitoring and alerting (CloudWatch)
- [x] Backup and recovery (RDS snapshots)
- [x] Multi-tenant isolation (RLS)
- [x] Audit trails (CloudWatch Logs)

### GDPR Requirements

- [x] Data retention (90 days)
- [x] Data deletion (lifecycle policies)
- [x] Data encryption
- [x] Access controls
- [x] Audit logging

## Support

For deployment issues:
- Check CloudFormation events
- Review CloudWatch logs
- Contact: devops@veraproof.ai
