# VeraProof AI - POC Cost Optimization for AWS Builder Center

## 🎯 POC Requirements

- **Purpose**: Proof of Concept for AWS Builder Center program
- **Budget**: Minimal cost (leverage free tiers)
- **Configuration**: Single minimal setup (no dev/staging/prod separation)
- **Duration**: 3-6 months POC phase

---

## 💰 AWS Free Tier Analysis

### Lightsail Free Tier (3 Months)

**What's Included:**
✅ **Lightsail Instances**: 750 hours/month of Nano instance (first 3 months)
✅ **Lightsail Container Service**: 750 hours/month of Nano power (first 3 months)
✅ **Lightsail Storage**: 20 GB SSD storage (first 3 months)
✅ **Lightsail Data Transfer**: 1 TB outbound data transfer (first 3 months)

**What's NOT Included:**
❌ RDS Database (separate service, not part of Lightsail)
❌ S3 Storage (separate service)
❌ CloudFront (separate service)
❌ Cognito (separate service)

**Source**: https://aws.amazon.com/lightsail/pricing/

### Other AWS Free Tiers (12 Months)

✅ **RDS**: 750 hours/month of db.t2.micro or db.t3.micro (12 months)
✅ **S3**: 5 GB standard storage, 20,000 GET requests, 2,000 PUT requests (12 months)
✅ **CloudFront**: 1 TB data transfer out, 10,000,000 HTTP/HTTPS requests (12 months)
✅ **Cognito**: 50,000 MAUs free (always free)
✅ **CloudWatch**: 10 custom metrics, 10 alarms, 1,000,000 API requests (always free)
✅ **Lambda**: 1M requests/month, 400,000 GB-seconds compute (always free)

---

## 🏗️ POC Architecture (Single Stage - Minimal)

### Recommended Stack for POC

```
┌─────────────────────────────────────────────────────────┐
│                    POC ARCHITECTURE                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (S3 + CloudFront) ──────► FREE (12 months)   │
│       │                                                 │
│       ├──► Lightsail Container ────► FREE (3 months)   │
│       │         │                                       │
│       │         ├──► RDS t3.micro ──► FREE (12 months) │
│       │         │                                       │
│       │         └──► S3 Storage ────► FREE (12 months) │
│       │                                                 │
│       └──► Cognito ────────────────► FREE (always)     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 💵 Detailed Cost Breakdown (POC - Single Stage)

### Month 1-3: Maximum Free Tier Usage

| Service | Configuration | Free Tier | Cost |
|---------|--------------|-----------|------|
| **Compute** | | | |
| Lightsail Container | 1x Nano (0.25 vCPU, 512MB) | 750 hrs/month (3 months) | **$0.00** |
| | | | |
| **Database** | | | |
| RDS PostgreSQL | db.t3.micro (1 vCPU, 1GB, 20GB) | 750 hrs/month (12 months) | **$0.00** |
| RDS Storage | 20 GB GP3 | 20 GB free (12 months) | **$0.00** |
| RDS Backups | 20 GB backup storage | Included in free tier | **$0.00** |
| | | | |
| **Storage** | | | |
| S3 Artifacts | 5 GB storage, 2K PUT, 20K GET | 5 GB free (12 months) | **$0.00** |
| S3 Branding | < 1 GB storage | Within free tier | **$0.00** |
| | | | |
| **Frontend** | | | |
| S3 Dashboard | < 100 MB | Within free tier | **$0.00** |
| S3 Verification | < 50 MB | Within free tier | **$0.00** |
| CloudFront (Dashboard) | < 100 GB transfer | 1 TB free (12 months) | **$0.00** |
| CloudFront (Verification) | < 100 GB transfer | Within free tier | **$0.00** |
| | | | |
| **Authentication** | | | |
| Cognito User Pool | < 50 MAUs | 50K free (always) | **$0.00** |
| | | | |
| **Monitoring** | | | |
| CloudWatch Logs | < 5 GB ingestion | 5 GB free (always) | **$0.00** |
| CloudWatch Alarms | 4 alarms | 10 free (always) | **$0.00** |
| SNS | < 1000 notifications | 1000 free (always) | **$0.00** |
| | | | |
| **Secrets** | | | |
| Secrets Manager | 1 secret | $0.40/month | **$0.40** |
| | | | |
| **Network** | | | |
| VPC | Standard VPC | Free | **$0.00** |
| Internet Gateway | Data transfer | Within Lightsail free tier | **$0.00** |
| | | | |
| **TOTAL (Months 1-3)** | | | **$0.40/month** |

### Month 4-12: After Lightsail Free Tier Expires

| Service | Configuration | Free Tier | Cost |
|---------|--------------|-----------|------|
| **Compute** | | | |
| Lightsail Container | 1x Nano (0.25 vCPU, 512MB) | Expired | **$7.00** |
| | | | |
| **Database** | | | |
| RDS PostgreSQL | db.t3.micro | Still free | **$0.00** |
| | | | |
| **Storage** | | | |
| S3 | All buckets | Still free | **$0.00** |
| | | | |
| **Frontend** | | | |
| CloudFront | Both distributions | Still free | **$0.00** |
| | | | |
| **Authentication** | | | |
| Cognito | < 50 MAUs | Always free | **$0.00** |
| | | | |
| **Monitoring** | | | |
| CloudWatch | Logs + Alarms | Always free | **$0.00** |
| | | | |
| **Secrets** | | | |
| Secrets Manager | 1 secret | No free tier | **$0.40** |
| | | | |
| **TOTAL (Months 4-12)** | | | **$7.40/month** |

### Month 13+: After RDS Free Tier Expires

| Service | Cost |
|---------|------|
| Lightsail Container (Nano) | $7.00 |
| RDS t3.micro | $15.00 |
| S3 (minimal usage) | $0.50 |
| CloudFront (minimal) | $1.00 |
| Secrets Manager | $0.40 |
| **TOTAL** | **$23.90/month** |

---

## 📊 POC Cost Summary

```
┌─────────────────────────────────────────────────────┐
│              POC COST TIMELINE                      │
├──────────────┬──────────────┬───────────────────────┤
│   Period     │  Monthly     │  Cumulative           │
├──────────────┼──────────────┼───────────────────────┤
│ Months 1-3   │   $0.40      │   $1.20               │
│ Months 4-12  │   $7.40      │  $67.80               │
│ Month 13+    │  $23.90      │  Ongoing              │
├──────────────┼──────────────┼───────────────────────┤
│ First Year   │   Average    │  $69.00 total         │
│ (12 months)  │   $5.75/mo   │                       │
└──────────────┴──────────────┴───────────────────────┘
```

**POC Budget (6 months): ~$34.50 total**

---

## 🎯 Why We ARE Leveraging Free Tiers

### Current Implementation DOES Use Free Tiers:

✅ **Lightsail Nano**: Smallest instance (free for 3 months)
✅ **RDS t3.micro**: Smallest RDS instance (free for 12 months)
✅ **S3 Standard**: Within 5GB free tier
✅ **CloudFront**: Within 1TB free tier
✅ **Cognito**: Within 50K MAU free tier
✅ **CloudWatch**: Within free tier limits

### What We Can Optimize Further:

1. **Remove Secrets Manager** ($0.40/month)
   - Use environment variables instead
   - Store in SSM Parameter Store (free)

2. **Use Single Stage Only** (no dev/staging/prod)
   - Deploy only POC stage
   - Saves 2x infrastructure costs

3. **Optimize S3 Lifecycle**
   - Delete artifacts after 7 days (instead of 90)
   - Reduces storage costs

---

## 🔧 POC-Optimized Configuration

### Simplified Stack Configuration

```python
# infrastructure/app.py - POC Mode

stage = "poc"  # Single stage only
compute_mode = "lightsail"  # Always use Lightsail for POC

# Minimal configuration
poc_config = {
    "lightsail_power": "nano",  # 0.25 vCPU, 512MB - FREE for 3 months
    "lightsail_scale": 1,       # Single node
    "rds_instance": "db.t3.micro",  # FREE for 12 months
    "rds_storage": 20,          # 20GB - FREE for 12 months
    "rds_backup_retention": 1,  # Minimal backups
    "s3_lifecycle_days": 7,     # Delete after 7 days
    "cloudwatch_retention": 1,  # 1 day log retention
    "multi_az": False,          # Single AZ
    "nat_gateway": False,       # No NAT (use public subnets)
    "vpc_endpoints": False,     # No VPC endpoints
}
```

---

## 💡 Additional Cost Optimizations

### 1. Replace Secrets Manager with SSM Parameter Store

**Current**: Secrets Manager = $0.40/month  
**Alternative**: SSM Parameter Store (Standard) = **FREE**

```python
# Use SSM Parameter Store instead of Secrets Manager
ssm.StringParameter(
    self,
    "DB-Password",
    parameter_name=f"/veraproof/poc/db-password",
    string_value="<generated-password>",
    tier=ssm.ParameterTier.STANDARD  # FREE
)
```

**Savings**: $0.40/month = $4.80/year

### 2. Use PostgreSQL on Lightsail Instead of RDS

**Current**: RDS t3.micro = $15/month (after free tier)  
**Alternative**: Lightsail Database (Micro) = $15/month BUT includes 3-month free trial

**Benefit**: Extends free database usage by 3 months

### 3. Reduce CloudWatch Log Retention

**Current**: 7-day retention  
**POC**: 1-day retention = **FREE** (within always-free tier)

### 4. Use S3 Intelligent-Tiering

**Current**: S3 Standard  
**POC**: S3 Intelligent-Tiering (auto-moves to cheaper tiers)

**Savings**: ~30% on storage costs

---

## 🚀 Ultra-Minimal POC Configuration

### Absolute Minimum Setup (First 3 Months = $0)

| Service | Configuration | Cost (Months 1-3) |
|---------|--------------|-------------------|
| Lightsail Container | 1x Nano | **$0.00** (free tier) |
| Lightsail Database | 1x Micro PostgreSQL | **$0.00** (free tier) |
| S3 | < 5GB total | **$0.00** (free tier) |
| CloudFront | < 1TB transfer | **$0.00** (free tier) |
| Cognito | < 50 MAUs | **$0.00** (always free) |
| CloudWatch | Minimal logs | **$0.00** (always free) |
| SSM Parameter Store | Standard tier | **$0.00** (always free) |
| **TOTAL** | | **$0.00/month** |

**Yes, you can run the POC for FREE for the first 3 months!**

---

## 📋 Recommended POC Deployment Strategy

### Phase 1: Months 1-3 (FREE)
```bash
# Deploy ultra-minimal POC configuration
./deploy.sh poc 123456789012 lightsail --minimal

Resources:
- Lightsail Container (Nano) - FREE
- Lightsail Database (Micro) - FREE
- S3 (< 5GB) - FREE
- CloudFront - FREE
- Cognito - FREE

Cost: $0.00/month
```

### Phase 2: Months 4-6 ($7/month)
```bash
# Lightsail free tier expires, but RDS still free
# Continue with same setup

Cost: $7.00/month (Lightsail Container only)
```

### Phase 3: Months 7-12 ($7/month)
```bash
# RDS free tier still active
# Continue with same setup

Cost: $7.00/month
```

### Phase 4: Month 13+ ($23/month)
```bash
# All free tiers expired
# Evaluate: Continue POC or scale up

Cost: $23.90/month
```

---

## 🎯 POC Cost Comparison

| Approach | Months 1-3 | Months 4-12 | Year 1 Total |
|----------|------------|-------------|--------------|
| **Current (3 stages)** | $765/mo | $765/mo | $9,180 |
| **Single Stage (Optimized)** | $28/mo | $28/mo | $336 |
| **POC (Ultra-Minimal)** | $0/mo | $7/mo | $63 |
| **POC (Lightsail DB)** | $0/mo | $0/mo | **$0** |

**Savings with POC approach: $9,117 in first year!**

---

## ✅ Action Items for POC Optimization

1. **Create POC-specific CDK configuration**
   - Single stage deployment
   - Minimal resource sizing
   - Free tier optimized

2. **Replace Secrets Manager with SSM Parameter Store**
   - Save $0.40/month
   - Still secure

3. **Use Lightsail Database instead of RDS**
   - Get 3 months free (instead of paying after RDS free tier)
   - Simpler management

4. **Reduce log retention to 1 day**
   - Stay within always-free tier
   - Sufficient for POC

5. **Set S3 lifecycle to 7 days**
   - Reduce storage costs
   - Sufficient for POC testing

---

## 📝 Updated Deployment Command

```bash
# Deploy POC with ultra-minimal configuration
cd infrastructure
./deploy.sh poc 123456789012 lightsail --poc-mode

# This will:
# ✓ Use Lightsail Container (Nano) - FREE for 3 months
# ✓ Use Lightsail Database (Micro) - FREE for 3 months
# ✓ Use SSM Parameter Store - FREE always
# ✓ Optimize all resources for free tier
# ✓ Single stage deployment only

# Expected cost: $0.00/month for first 3 months
```

---

## 🎉 Summary

**Your POC can run for FREE for the first 3 months!**

- ✅ Lightsail Container: FREE (3 months)
- ✅ Lightsail Database: FREE (3 months)
- ✅ S3 Storage: FREE (12 months)
- ✅ CloudFront: FREE (12 months)
- ✅ Cognito: FREE (always)
- ✅ CloudWatch: FREE (always)
- ✅ SSM Parameters: FREE (always)

**Total POC Cost:**
- Months 1-3: **$0.00/month**
- Months 4-12: **$7.00/month** (Lightsail Container only)
- Year 1 Total: **$63.00**

**vs. Original 3-stage setup: $9,180/year**

**Savings: $9,117 (99.3% reduction!)**
