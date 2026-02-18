# VeraProof AI - Final Cost Summary for AWS Builder Center Production

## 🎯 Executive Summary

**Your production environment runs for FREE for 3 months, then only $7-22/month!**

- **Months 1-3**: $0.00/month (all free tiers)
- **Months 4-12**: $7-22/month (partial free tiers)
- **Year 1 Total**: $63-198

**No separate deployment scripts** - use scale-as-you-go approach via CDK context.

---

## 💰 Complete Cost Breakdown by Service

### Compute

| Service | Config | Months 1-3 | Months 4-12 | Month 13+ | Notes |
|---------|--------|------------|-------------|-----------|-------|
| **Lightsail Container** | Nano (0.25 vCPU, 512MB) | **$0.00** | **$7.00** | **$7.00** | FREE for 3 months |

**Free Tier**: 750 hours/month for 3 months

---

### Database

| Service | Config | Months 1-3 | Months 4-12 | Month 13+ | Notes |
|---------|--------|------------|-------------|-----------|-------|
| **Option A: Lightsail DB** | Micro (1 vCPU, 1GB, 40GB) | **$0.00** | **$15.00** | **$15.00** | FREE for 3 months |
| **Option B: RDS** | t3.micro (1 vCPU, 1GB, 20GB) | **$0.00** | **$0.00** | **$15.00** | FREE for 12 months |

**Recommendation**: Use RDS for longer free tier (12 months vs 3 months)

---

### Storage

| Service | Config | Months 1-12 | Month 13+ | Notes |
|---------|--------|-------------|-----------|-------|
| **S3 Artifacts** | < 5GB, 2K PUT, 20K GET | **$0.00** | **$0.50** | FREE for 12 months |
| **S3 Branding** | < 1GB | **$0.00** | **$0.10** | Within free tier |
| **S3 Dashboard** | < 100MB | **$0.00** | **$0.05** | Within free tier |
| **S3 Verification** | < 50MB | **$0.00** | **$0.05** | Within free tier |

**Free Tier**: 5GB storage, 20K GET, 2K PUT for 12 months

---

### Content Delivery

| Service | Config | Months 1-12 | Month 13+ | Notes |
|---------|--------|-------------|-----------|-------|
| **CloudFront (Dashboard)** | < 100GB transfer | **$0.00** | **$8.50** | FREE for 12 months |
| **CloudFront (Verification)** | < 100GB transfer | **$0.00** | **$0.75** | Within free tier |

**Free Tier**: 1TB transfer, 10M requests for 12 months

---

### Authentication

| Service | Config | All Months | Notes |
|---------|--------|------------|-------|
| **Cognito User Pool** | < 50 MAUs | **$0.00** | Always FREE |

**Free Tier**: 50,000 MAUs (always free)

---

### Monitoring

| Service | Config | All Months | Notes |
|---------|--------|------------|-------|
| **CloudWatch Logs** | < 5GB ingestion, 1-day retention | **$0.00** | Always FREE |
| **CloudWatch Alarms** | 4 alarms | **$0.00** | Always FREE (10 free) |
| **CloudWatch Dashboard** | 1 dashboard | **$0.00** | Always FREE (3 free) |
| **SNS Notifications** | < 1000/month | **$0.00** | Always FREE |

**Free Tier**: 5GB logs, 10 alarms, 3 dashboards (always free)

---

### Secrets Management

| Service | Config | All Months | Notes |
|---------|--------|------------|-------|
| **SSM Parameter Store** | Standard tier | **$0.00** | Always FREE |
| ~~Secrets Manager~~ | ~~1 secret~~ | ~~$0.40~~ | Not recommended for POC |

**Recommendation**: Use SSM Parameter Store (FREE) instead of Secrets Manager ($0.40/month)

---

### Networking

| Service | Config | All Months | Notes |
|---------|--------|------------|-------|
| **VPC** | 1 VPC, 4 subnets | **$0.00** | Always FREE |
| **Internet Gateway** | 1 IGW | **$0.00** | Always FREE |
| **Security Groups** | 2 groups | **$0.00** | Always FREE |
| **NAT Gateway** | NONE (using public subnets) | **$0.00** | Saves $37.35/month |
| **VPC Endpoints** | NONE (not needed for POC) | **$0.00** | Saves $22.90/month |
| **Data Transfer (Lightsail)** | < 1TB/month | **$0.00** | Included in Lightsail |
| **Data Transfer (Internet)** | < 100GB/month | **$0.00** | First 100GB FREE |
| **Load Balancer** | Included in Lightsail | **$0.00** | Saves $22.27/month |

**Total Networking Cost**: $0.00/month

**See**: [NETWORKING_COSTS_BREAKDOWN.md](./NETWORKING_COSTS_BREAKDOWN.md) for complete details

---

## 📊 Total Monthly Costs

### Option A: Lightsail Database (3-month free tier)

| Period | Compute | Database | Storage | CDN | Auth | Monitoring | Secrets | Network | **TOTAL** |
|--------|---------|----------|---------|-----|------|------------|---------|---------|-----------|
| **Months 1-3** | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | **$0.00** |
| **Months 4-12** | $7.00 | $15.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | **$22.00** |
| **Month 13+** | $7.00 | $15.00 | $0.70 | $9.25 | $0.00 | $0.00 | $0.00 | $0.00 | **$31.95** |

**Year 1 Total**: $0 × 3 + $22 × 9 = **$198.00**

---

### Option B: RDS (12-month free tier) - RECOMMENDED

| Period | Compute | Database | Storage | CDN | Auth | Monitoring | Secrets | Network | **TOTAL** |
|--------|---------|----------|---------|-----|------|------------|---------|---------|-----------|
| **Months 1-3** | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | **$0.00** |
| **Months 4-12** | $7.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | $0.00 | **$7.00** |
| **Month 13+** | $7.00 | $15.00 | $0.70 | $9.25 | $0.00 | $0.00 | $0.00 | $0.00 | **$31.95** |

**Year 1 Total**: $0 × 3 + $7 × 9 = **$63.00**

---

## 🎯 Recommended Configuration for Production

```yaml
Stage: prod (single stage)
Region: ap-south-1 (Mumbai)

Compute:
  Type: Lightsail Container
  Size: Nano (0.25 vCPU, 512MB)
  Scale: 1 node
  Cost: $0 (months 1-3), $7 (months 4+)

Database:
  Type: RDS PostgreSQL
  Size: db.t3.micro (1 vCPU, 1GB)
  Storage: 20GB
  Multi-AZ: No
  Cost: $0 (months 1-12), $15 (months 13+)

Storage:
  S3 Artifacts: < 5GB
  S3 Branding: < 1GB
  Lifecycle: 7 days (vs 90 for production)
  Cost: $0 (months 1-12), $0.70 (months 13+)

Frontend:
  CloudFront: 2 distributions
  Transfer: < 100GB/month
  Cost: $0 (months 1-12), $9.25 (months 13+)

Authentication:
  Cognito: < 50 MAUs
  Cost: $0 (always)

Monitoring:
  CloudWatch: 1-day log retention
  Alarms: 4 alarms
  Cost: $0 (always)

Secrets:
  SSM Parameter Store: Standard tier
  Cost: $0 (always)

Network:
  VPC: Public subnets only
  NAT Gateway: None
  VPC Endpoints: None
  Cost: $0 (always)

TOTAL COST:
  Months 1-3: $0.00/month
  Months 4-12: $7.00/month
  Year 1: $63.00
```

---

## 🚀 Deployment Command

```bash
# Single deployment script - scale via CDK context
cd infrastructure
./deploy.sh prod 123456789012 lightsail

# Adjust configuration in cdk.json as needed:
{
  "context": {
    "stage": "prod",
    "compute": "lightsail",
    "account": "123456789012",
    "lightsail_power": "nano",
    "rds_instance": "db.t3.micro",
    "s3_lifecycle_days": 7,
    "log_retention_days": 1
  }
}
```

**No separate deployment scripts** - manage configuration via context.

---

## 📈 Cost Comparison

| Approach | Year 1 Cost | Savings vs Original |
|----------|-------------|---------------------|
| **Original (3 stages)** | $9,180 | - |
| **Single Stage (Optimized)** | $336 | $8,844 (96%) |
| **Production (RDS - Recommended)** | **$63** | **$9,117 (99%)** |
| **Production (Lightsail DB)** | $198 | $8,982 (98%) |

---

## 💡 Key Optimizations Applied

1. ✅ **Single stage deployment** - Save $700/month
2. ✅ **Lightsail Container (Nano)** - FREE for 3 months
3. ✅ **RDS t3.micro** - FREE for 12 months (vs Lightsail 3 months)
4. ✅ **SSM Parameter Store** - FREE (vs Secrets Manager $0.40/month)
5. ✅ **Public subnets only** - Save $37.35/month (no NAT Gateway)
6. ✅ **No VPC Endpoints** - Save $22.90/month
7. ✅ **1-day log retention** - Stay in free tier
8. ✅ **7-day artifact lifecycle** - Reduce storage costs
9. ✅ **Lightsail includes load balancing** - Save $22.27/month
10. ✅ **Lightsail includes 1TB transfer** - Save data transfer costs

**Total Monthly Savings**: $783/month vs original 3-stage setup

---

## 📚 Documentation

- **[POC_COST_OPTIMIZATION.md](./POC_COST_OPTIMIZATION.md)** - Free tier analysis and optimization strategies
- **[POC_DEPLOYMENT_GUIDE.md](./POC_DEPLOYMENT_GUIDE.md)** - Detailed per-resource cost breakdown
- **[NETWORKING_COSTS_BREAKDOWN.md](./NETWORKING_COSTS_BREAKDOWN.md)** - Complete networking cost analysis
- **[README.md](./README.md)** - Project overview and quick start

---

## ⚠️ Important Notes

### Free Tier Expiration Timeline

```
Month 1-3:   Everything FREE ($0/month)
Month 4:     Lightsail Container starts charging ($7/month)
Month 13:    RDS starts charging ($15/month)
Month 13:    S3/CloudFront start charging (~$10/month)
```

### Monitoring Recommendations

1. **Set up billing alerts**:
   - Alert at $5/month
   - Alert at $10/month
   - Alert at $20/month

2. **Monitor free tier usage**:
   - AWS Billing Console → Free Tier
   - Check weekly during initial deployment

3. **Enable Cost Explorer**:
   - Track daily costs
   - Identify cost spikes early

### Scale-As-You-Go

When ready to scale up, update CDK context:

```json
{
  "context": {
    "lightsail_power": "micro",  // Upgrade from nano
    "rds_instance": "db.t3.small",  // Upgrade from micro
    "s3_lifecycle_days": 30,  // Increase retention
    "log_retention_days": 7  // Increase retention
  }
}
```

Then redeploy:
```bash
./deploy.sh prod 123456789012 lightsail
```

---

## 🎉 Summary

**Your production environment costs $0 for 3 months, then only $7/month!**

- ✅ Lightsail Container: FREE (3 months)
- ✅ RDS Database: FREE (12 months)
- ✅ S3 Storage: FREE (12 months)
- ✅ CloudFront: FREE (12 months)
- ✅ Cognito: FREE (always)
- ✅ CloudWatch: FREE (always)
- ✅ Networking: FREE (always)

**Total Year 1 Cost: $63**

**vs. Original 3-stage setup: $9,180**

**You save 99.3%!** 🎉
