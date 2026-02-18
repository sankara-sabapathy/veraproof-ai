# VeraProof AI - AWS Resources and Cost Estimation

## Deployment Options

The original specification mentions **AWS Lightsail Container** for backend deployment. We have implemented **TWO deployment options**:

### Option 1: AWS Lightsail (Recommended for Cost-Effectiveness)
- **Best for**: Startups, MVPs, predictable workloads
- **Cost**: $7-40/month for compute (fixed pricing)
- **Pros**: Simple, predictable costs, easy management
- **Cons**: Limited scaling, fewer advanced features

### Option 2: ECS Fargate (Enterprise-Grade)
- **Best for**: Production, high-scale, enterprise deployments
- **Cost**: $30-200/month for compute (pay-per-use)
- **Pros**: Auto-scaling, advanced features, better monitoring
- **Cons**: More complex, higher costs at scale

## Complete AWS Resource List

### 1. Network Infrastructure (VPC Stack)

| Resource | Purpose | Quantity per Stage |
|----------|---------|-------------------|
| VPC | Isolated network | 1 |
| Public Subnets | Internet-facing resources | 2 (across 2 AZs) |
| Private Subnets | Backend resources | 2 (across 2 AZs) |
| Internet Gateway | Internet connectivity | 1 |
| NAT Gateway | Outbound internet for private subnets | 1 (prod only) |
| Security Groups | Firewall rules | 2 (API + Database) |
| VPC Endpoints | AWS service access | 3 (S3, ECR API, ECR Docker) - prod only |

### 2. Compute Infrastructure

#### Option A: Lightsail Container Service
| Resource | Dev | Staging | Prod |
|----------|-----|---------|------|
| Container Service | 1x Nano (0.25 vCPU, 512MB) | 1x Micro (0.25 vCPU, 1GB) | 2x Small (0.5 vCPU, 2GB each) |
| IAM Role | 1 | 1 | 1 |
| SSM Parameter | 1 | 1 | 1 |

#### Option B: ECS Fargate
| Resource | Dev | Staging | Prod |
|----------|-----|---------|------|
| ECS Cluster | 1 | 1 | 1 |
| Fargate Tasks | 1 (0.5 vCPU, 1GB) | 2 (1 vCPU, 2GB each) | 2-10 (1 vCPU, 2GB each) |
| Application Load Balancer | 1 | 1 | 1 |
| Target Groups | 1 | 1 | 1 |
| ECR Repository | 1 | 1 | 1 |
| CloudWatch Log Groups | 1 | 1 | 1 |

### 3. Database Infrastructure (RDS Stack)

| Resource | Dev | Staging | Prod |
|----------|-----|---------|------|
| RDS PostgreSQL | db.t3.micro (1 vCPU, 1GB) | db.t3.small (2 vCPU, 2GB) | db.r5.large (2 vCPU, 16GB) |
| Storage | 20GB GP3 | 50GB GP3 | 100GB GP3 |
| Multi-AZ | No | No | Yes |
| Automated Backups | 1 day retention | 1 day retention | 7 days retention |
| Secrets Manager Secret | 1 | 1 | 1 |
| Performance Insights | No | No | Yes |

### 4. Storage Infrastructure (S3 Stack)

| Resource | Purpose | Lifecycle Policy |
|----------|---------|-----------------|
| Artifacts Bucket | Videos, IMU data, optical flow | 90-day deletion, 30-day Glacier transition |
| Branding Bucket | Partner logos and assets | No expiration |

### 5. Authentication Infrastructure (Cognito Stack)

| Resource | Purpose | Quantity |
|----------|---------|----------|
| Cognito User Pool | Partner authentication | 1 per stage |
| User Pool Client | Dashboard app | 1 per stage |
| User Pool Domain | OAuth endpoints | 1 per stage |

### 6. Frontend Infrastructure (CloudFront Stack)

| Resource | Purpose | Quantity |
|----------|---------|----------|
| S3 Bucket (Dashboard) | Angular dashboard hosting | 1 per stage |
| S3 Bucket (Verification) | Vanilla JS verification interface | 1 per stage |
| CloudFront Distribution (Dashboard) | CDN for dashboard | 1 per stage |
| CloudFront Distribution (Verification) | CDN for verification interface | 1 per stage |
| Origin Access Identity | Secure S3 access | 2 per stage |

### 7. Monitoring Infrastructure (CloudWatch Stack)

| Resource | Purpose | Quantity |
|----------|---------|----------|
| CloudWatch Dashboard | Metrics visualization | 1 per stage |
| CloudWatch Alarms | Alert on issues | 4 per stage |
| SNS Topic | Alert notifications | 1 per stage |
| CloudWatch Logs | Application logs | Multiple log groups |

---

## Detailed Cost Estimation

### Development Stage (dev)

#### Option A: Lightsail Deployment
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **Compute** | | |
| Lightsail Container (Nano) | 0.25 vCPU, 512MB RAM, 1 node | $7.00 |
| **Database** | | |
| RDS PostgreSQL (db.t3.micro) | 1 vCPU, 1GB RAM, 20GB storage | $15.00 |
| Automated Backups | 1 day retention | $0.50 |
| **Storage** | | |
| S3 Artifacts Bucket | ~10GB storage, ~100 requests | $0.25 |
| S3 Branding Bucket | ~1GB storage, ~50 requests | $0.03 |
| **Frontend** | | |
| S3 Dashboard Hosting | ~100MB, ~1000 requests | $0.05 |
| S3 Verification Hosting | ~50MB, ~500 requests | $0.03 |
| CloudFront (Dashboard) | ~10GB transfer, ~10K requests | $1.20 |
| CloudFront (Verification) | ~5GB transfer, ~5K requests | $0.60 |
| **Authentication** | | |
| Cognito User Pool | ~10 MAUs | $0.00 (free tier) |
| **Monitoring** | | |
| CloudWatch Logs | ~5GB ingestion, 1-week retention | $2.50 |
| CloudWatch Alarms | 4 alarms | $0.40 |
| SNS | ~100 notifications | $0.01 |
| **Secrets Manager** | | |
| Database Credentials | 1 secret | $0.40 |
| **SSM Parameter Store** | | |
| Configuration Parameters | Standard tier | $0.00 (free) |
| **TOTAL (Lightsail)** | | **~$27.97/month** |

#### Option B: ECS Fargate Deployment
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **Compute** | | |
| ECS Fargate | 0.5 vCPU, 1GB RAM, 1 task, 24/7 | $14.60 |
| Application Load Balancer | 1 ALB, ~100GB processed | $17.50 |
| ECR Repository | ~5GB storage | $0.50 |
| **Database** | Same as Lightsail | $15.50 |
| **Storage** | Same as Lightsail | $0.28 |
| **Frontend** | Same as Lightsail | $1.88 |
| **Authentication** | Same as Lightsail | $0.00 |
| **Monitoring** | Same as Lightsail | $2.91 |
| **Secrets Manager** | Same as Lightsail | $0.40 |
| **TOTAL (ECS Fargate)** | | **~$53.57/month** |

---

### Staging Stage (staging)

#### Option A: Lightsail Deployment
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **Compute** | | |
| Lightsail Container (Micro) | 0.25 vCPU, 1GB RAM, 1 node | $10.00 |
| **Database** | | |
| RDS PostgreSQL (db.t3.small) | 2 vCPU, 2GB RAM, 50GB storage | $30.00 |
| Automated Backups | 1 day retention, ~50GB | $1.25 |
| **Storage** | | |
| S3 Artifacts Bucket | ~50GB storage, ~500 requests | $1.20 |
| S3 Branding Bucket | ~2GB storage, ~100 requests | $0.05 |
| **Frontend** | | |
| S3 Dashboard Hosting | ~100MB, ~5000 requests | $0.10 |
| S3 Verification Hosting | ~50MB, ~2500 requests | $0.05 |
| CloudFront (Dashboard) | ~50GB transfer, ~50K requests | $5.50 |
| CloudFront (Verification) | ~25GB transfer, ~25K requests | $2.75 |
| **Authentication** | | |
| Cognito User Pool | ~50 MAUs | $0.00 (free tier) |
| **Monitoring** | | |
| CloudWatch Logs | ~20GB ingestion, 1-week retention | $10.00 |
| CloudWatch Alarms | 4 alarms | $0.40 |
| SNS | ~500 notifications | $0.05 |
| **Secrets Manager** | | |
| Database Credentials | 1 secret | $0.40 |
| **TOTAL (Lightsail)** | | **~$61.75/month** |

#### Option B: ECS Fargate Deployment
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **Compute** | | |
| ECS Fargate | 1 vCPU, 2GB RAM, 2 tasks, 24/7 | $58.40 |
| Application Load Balancer | 1 ALB, ~500GB processed | $22.50 |
| ECR Repository | ~10GB storage | $1.00 |
| **Database** | Same as Lightsail | $31.25 |
| **Storage** | Same as Lightsail | $1.25 |
| **Frontend** | Same as Lightsail | $8.40 |
| **Authentication** | Same as Lightsail | $0.00 |
| **Monitoring** | Same as Lightsail | $10.45 |
| **Secrets Manager** | Same as Lightsail | $0.40 |
| **TOTAL (ECS Fargate)** | | **~$133.65/month** |

---

### Production Stage (prod)

#### Option A: Lightsail Deployment
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **Compute** | | |
| Lightsail Container (Small) | 0.5 vCPU, 2GB RAM, 2 nodes | $80.00 |
| **Database** | | |
| RDS PostgreSQL (db.r5.large) | 2 vCPU, 16GB RAM, 100GB storage | $180.00 |
| Multi-AZ Deployment | Standby instance | $180.00 |
| Automated Backups | 7 days retention, ~100GB | $2.50 |
| Performance Insights | 7 days retention | $3.50 |
| **Storage** | | |
| S3 Artifacts Bucket | ~500GB storage, ~5000 requests | $11.50 |
| S3 Glacier (Artifacts) | ~200GB archived | $0.80 |
| S3 Branding Bucket | ~10GB storage, ~1000 requests | $0.25 |
| **Frontend** | | |
| S3 Dashboard Hosting | ~100MB, ~50K requests | $0.25 |
| S3 Verification Hosting | ~50MB, ~25K requests | $0.15 |
| CloudFront (Dashboard) | ~500GB transfer, ~500K requests | $50.00 |
| CloudFront (Verification) | ~250GB transfer, ~250K requests | $25.00 |
| **Authentication** | | |
| Cognito User Pool | ~500 MAUs | $27.50 |
| Advanced Security | Adaptive auth | $5.00 |
| **Monitoring** | | |
| CloudWatch Logs | ~100GB ingestion, 1-month retention | $50.00 |
| CloudWatch Alarms | 4 alarms | $0.40 |
| SNS | ~5000 notifications | $0.50 |
| **Network** | | |
| NAT Gateway | 1 gateway, ~100GB data | $35.00 |
| VPC Endpoints | 3 endpoints, ~100GB data | $22.50 |
| **Secrets Manager** | | |
| Database Credentials | 1 secret | $0.40 |
| **TOTAL (Lightsail)** | | **~$675.25/month** |

#### Option B: ECS Fargate Deployment
| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| **Compute** | | |
| ECS Fargate | 1 vCPU, 2GB RAM, 2-10 tasks (avg 4), 24/7 | $116.80 |
| Application Load Balancer | 1 ALB, ~5TB processed | $67.50 |
| ECR Repository | ~50GB storage | $5.00 |
| Container Insights | Enhanced monitoring | $10.00 |
| **Database** | Same as Lightsail | $366.00 |
| **Storage** | Same as Lightsail | $12.55 |
| **Frontend** | Same as Lightsail | $75.40 |
| **Authentication** | Same as Lightsail | $32.50 |
| **Monitoring** | Same as Lightsail | $50.90 |
| **Network** | Same as Lightsail | $57.50 |
| **Secrets Manager** | Same as Lightsail | $0.40 |
| **TOTAL (ECS Fargate)** | | **~$794.55/month** |

---

## Cost Summary Comparison

| Stage | Lightsail (Monthly) | ECS Fargate (Monthly) | Annual Savings (Lightsail) |
|-------|--------------------|-----------------------|---------------------------|
| **Development** | $27.97 | $53.57 | $307.20 |
| **Staging** | $61.75 | $133.65 | $862.80 |
| **Production** | $675.25 | $794.55 | $1,431.60 |
| **All Stages** | $765.00 | $981.77 | $2,601.24 |

---

## Cost Optimization Recommendations

### 1. Use Lightsail for Development and Staging
- **Savings**: ~$100/month compared to ECS Fargate
- **Trade-off**: Limited auto-scaling, but sufficient for non-production

### 2. Consider Lightsail for Production (MVP Phase)
- **Savings**: ~$120/month compared to ECS Fargate
- **When to switch to ECS**: When you need:
  - Auto-scaling beyond 2 nodes
  - Advanced monitoring and observability
  - Blue/green deployments
  - Service mesh integration

### 3. S3 Lifecycle Policies
- Already implemented: 90-day deletion, 30-day Glacier transition
- **Savings**: ~60% on long-term storage

### 4. Reserved Instances (Production Only)
- RDS Reserved Instances: ~40% savings
- **Potential savings**: $150/month on production database

### 5. CloudFront Optimization
- Enable compression (already configured)
- Use CloudFront caching (already configured)
- **Current setup**: Optimized

### 6. Cognito Free Tier
- First 50 MAUs free
- **Current cost**: $0 for dev/staging

---

## Deployment Architecture Decision

### Recommendation: Hybrid Approach

1. **Development**: Lightsail ($28/month)
   - Simple, cost-effective
   - Easy debugging and testing

2. **Staging**: Lightsail ($62/month)
   - Production-like environment
   - Cost-effective for testing

3. **Production**: Start with Lightsail ($675/month), migrate to ECS Fargate when needed
   - Initial launch: Lightsail (predictable costs)
   - Scale-up trigger: >1000 verifications/day or need for advanced features
   - Migration path: CDK already supports both options

### Total Initial Cost: ~$765/month for all three stages

---

## Additional Costs to Consider

### 1. Domain and SSL Certificates
- Route 53 Hosted Zone: $0.50/month per domain
- ACM SSL Certificates: Free
- **Estimated**: $2/month

### 2. Data Transfer
- Included in estimates above
- CloudFront: First 1TB free (new accounts)

### 3. Third-Party Services
- Razorpay (Payment Gateway): 2% + ₹3 per transaction
- Email Service (SES): $0.10 per 1000 emails
- **Estimated**: Variable based on usage

### 4. Developer Tools
- GitHub Actions: 2000 minutes/month free
- **Estimated**: $0 (within free tier)

---

## Switching Between Lightsail and ECS Fargate

Both deployment options are fully implemented in the CDK infrastructure. To switch:

### Use Lightsail (Default for Cost-Effectiveness)
```bash
# Update infrastructure/app.py to use Lightsail stack
# Deploy
cdk deploy --all --context stage=dev
```

### Use ECS Fargate (Enterprise-Grade)
```bash
# Update infrastructure/app.py to use Compute stack
# Deploy
cdk deploy --all --context stage=prod
```

The infrastructure code supports both options with zero code changes required.

---

## Conclusion

**Answer to "Are we deploying to Lightsail?"**

Yes, the original specification mentions AWS Lightsail Container, and we have fully implemented Lightsail deployment. However, we also provide an ECS Fargate option for enterprise-grade deployments.

**Recommended Approach:**
- Start with Lightsail for all stages: **$765/month total**
- Migrate production to ECS Fargate when scaling beyond 2 nodes or requiring advanced features
- This provides the best balance of cost-effectiveness and scalability

**Total AWS Resources Created:**
- **7 CDK Stacks** across 3 stages (dev, staging, prod)
- **50+ AWS resources** per stage
- **150+ total resources** across all stages
- **Region**: ap-south-1 (Mumbai)
- **Naming**: Enterprise-grade with stage suffixes
