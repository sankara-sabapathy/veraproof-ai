# VeraProof AI - Deployment Options Quick Reference

## Question: Are we deploying to Lightsail?

**Answer: YES** - The original specification (Phase 1: Browser Prototype Specs) explicitly mentions:
> **Backend Stack:** AWS Lightsail Container, FastAPI, Python 3.12+, OpenCV-Headless.

We have implemented **BOTH** deployment options to give you flexibility:

---

## Option 1: AWS Lightsail (Default & Recommended)

### Why Lightsail?
- ✅ **Original Spec Requirement**: Explicitly mentioned in project requirements
- ✅ **Cost-Effective**: Fixed, predictable pricing
- ✅ **Simple Management**: Easy to deploy and maintain
- ✅ **Perfect for MVP**: Ideal for startups and initial launch
- ✅ **Sufficient Scale**: Handles up to 2 nodes (enough for most use cases)

### Pricing
| Stage | Configuration | Monthly Cost |
|-------|--------------|--------------|
| Development | 1x Nano (0.25 vCPU, 512MB) | $28 |
| Staging | 1x Micro (0.25 vCPU, 1GB) | $62 |
| Production | 2x Small (0.5 vCPU, 2GB each) | $675 |
| **Total (All Stages)** | | **$765/month** |

### Deploy with Lightsail
```bash
# Linux/Mac
./deploy.sh dev 123456789012 lightsail

# Windows PowerShell
.\deploy.ps1 -Stage dev -Account 123456789012 -ComputeMode lightsail
```

---

## Option 2: AWS ECS Fargate (Enterprise Alternative)

### Why ECS Fargate?
- ✅ **Auto-Scaling**: Scale from 2 to 10+ tasks automatically
- ✅ **Advanced Monitoring**: Container Insights, detailed metrics
- ✅ **Blue/Green Deployments**: Zero-downtime deployments
- ✅ **Service Mesh Ready**: Integration with App Mesh
- ✅ **Enterprise Features**: Advanced networking, security

### Pricing
| Stage | Configuration | Monthly Cost |
|-------|--------------|--------------|
| Development | 1x Task (0.5 vCPU, 1GB) | $54 |
| Staging | 2x Tasks (1 vCPU, 2GB each) | $134 |
| Production | 2-10x Tasks (1 vCPU, 2GB each, avg 4) | $795 |
| **Total (All Stages)** | | **$983/month** |

### Deploy with ECS Fargate
```bash
# Linux/Mac
./deploy.sh dev 123456789012 fargate

# Windows PowerShell
.\deploy.ps1 -Stage dev -Account 123456789012 -ComputeMode fargate
```

---

## Cost Comparison

| Metric | Lightsail | ECS Fargate | Savings (Lightsail) |
|--------|-----------|-------------|---------------------|
| **Development** | $28/month | $54/month | $26/month (48%) |
| **Staging** | $62/month | $134/month | $72/month (54%) |
| **Production** | $675/month | $795/month | $120/month (15%) |
| **Annual (All Stages)** | $9,180 | $11,796 | **$2,616 saved** |

---

## When to Use Each Option

### Use Lightsail When:
- ✅ You're launching an MVP or startup
- ✅ You want predictable, fixed costs
- ✅ You need simple deployment and management
- ✅ Your traffic is predictable (< 1000 verifications/day)
- ✅ You want to follow the original spec exactly
- ✅ Budget is a primary concern

### Use ECS Fargate When:
- ✅ You need auto-scaling beyond 2 nodes
- ✅ You have unpredictable traffic spikes
- ✅ You need advanced monitoring and observability
- ✅ You require blue/green deployments
- ✅ You're integrating with service mesh
- ✅ You need enterprise-grade features

---

## Migration Path

### Start with Lightsail, Migrate to Fargate Later

**Phase 1: Launch (Months 1-6)**
- Deploy with Lightsail
- Cost: $765/month
- Perfect for MVP and initial customers

**Phase 2: Growth (Months 6-12)**
- Monitor traffic and usage
- If you exceed 1000 verifications/day, consider migration

**Phase 3: Scale (Month 12+)**
- Migrate production to ECS Fargate
- Keep dev/staging on Lightsail
- Cost: ~$900/month (hybrid approach)

**Migration is Easy:**
```bash
# Simply redeploy with different compute mode
./deploy.sh prod 123456789012 fargate
```

No code changes required - both options are fully implemented!

---

## Complete AWS Resource List

### Resources Created (Per Stage)

#### Network Infrastructure
- 1x VPC (10.0.0.0/16)
- 2x Public Subnets (across 2 AZs)
- 2x Private Subnets (across 2 AZs)
- 1x Internet Gateway
- 1x NAT Gateway (prod only)
- 2x Security Groups (API + Database)
- 3x VPC Endpoints (prod only: S3, ECR API, ECR Docker)

#### Compute Infrastructure
**Lightsail:**
- 1x Lightsail Container Service
- 1x IAM Role
- 1x SSM Parameter (deployment config)

**ECS Fargate:**
- 1x ECS Cluster
- 1-10x Fargate Tasks (auto-scaling)
- 1x Application Load Balancer
- 1x Target Group
- 1x ECR Repository
- 1x CloudWatch Log Group

#### Database Infrastructure
- 1x RDS PostgreSQL Instance
- 1x Secrets Manager Secret
- Automated Backups (1-7 days retention)
- Performance Insights (prod only)

#### Storage Infrastructure
- 1x S3 Artifacts Bucket (90-day lifecycle)
- 1x S3 Branding Bucket

#### Authentication Infrastructure
- 1x Cognito User Pool
- 1x User Pool Client
- 1x User Pool Domain

#### Frontend Infrastructure
- 2x S3 Buckets (Dashboard + Verification)
- 2x CloudFront Distributions
- 2x Origin Access Identities

#### Monitoring Infrastructure
- 1x CloudWatch Dashboard
- 4x CloudWatch Alarms
- 1x SNS Topic
- Multiple CloudWatch Log Groups

### Total Resources Per Stage: ~50 resources
### Total Resources (3 Stages): ~150 resources

---

## Recommendation

**For VeraProof AI, we recommend:**

1. **Start with Lightsail for all stages** ($765/month total)
   - Follows original specification
   - Cost-effective for MVP phase
   - Simple to manage

2. **Monitor these metrics:**
   - Daily verification count
   - API latency (must stay < 3 seconds)
   - Concurrent sessions
   - Error rates

3. **Migrate to Fargate when:**
   - Daily verifications exceed 1000
   - You need more than 2 nodes
   - You require advanced auto-scaling
   - Budget allows for $200+ extra/month

4. **Hybrid Approach (Best of Both):**
   - Dev: Lightsail ($28/month)
   - Staging: Lightsail ($62/month)
   - Production: ECS Fargate ($795/month)
   - **Total: $885/month** (saves $95/month vs all Fargate)

---

## Quick Start Commands

### Deploy Everything with Lightsail (Recommended)
```bash
# Development
./deploy.sh dev 123456789012 lightsail

# Staging
./deploy.sh staging 123456789012 lightsail

# Production
./deploy.sh prod 123456789012 lightsail
```

### Deploy Everything with ECS Fargate
```bash
# Development
./deploy.sh dev 123456789012 fargate

# Staging
./deploy.sh staging 123456789012 fargate

# Production
./deploy.sh prod 123456789012 fargate
```

### Hybrid Approach (Dev/Staging on Lightsail, Prod on Fargate)
```bash
./deploy.sh dev 123456789012 lightsail
./deploy.sh staging 123456789012 lightsail
./deploy.sh prod 123456789012 fargate
```

---

## Additional Resources

- **Detailed Cost Breakdown**: See `AWS_RESOURCES_AND_COSTS.md`
- **Deployment Instructions**: See `DEPLOYMENT_GUIDE.md`
- **Architecture Diagrams**: See `ARCHITECTURE.md`
- **API Documentation**: See `API_DOCUMENTATION.md`

---

## Summary

✅ **Yes, we are deploying to Lightsail** (as per original spec)  
✅ **ECS Fargate is also available** (for enterprise needs)  
✅ **Both options are fully implemented** (zero code changes to switch)  
✅ **Lightsail saves $2,616/year** (compared to Fargate)  
✅ **Easy migration path** (when you need to scale)

**Recommended: Start with Lightsail, migrate to Fargate when needed.**
