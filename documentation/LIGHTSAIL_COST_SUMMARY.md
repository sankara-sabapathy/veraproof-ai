# VeraProof AI - Lightsail Cost Summary

## 🎯 AWS Lightsail Free Tier (3 Months)

According to AWS Lightsail documentation, the free tier includes:

✅ **3 months FREE on:**
- Lightsail Container Service: **Micro (1 node)** - $10/month value
- Lightsail Database: **Micro bundle** - $15/month value

**Total Free Tier Value:** $25/month × 3 months = **$75 savings**

---

## 💰 Complete Cost Breakdown

### Months 1-3 (Free Tier Active)

| Service | Configuration | Regular Price | Free Tier | Your Cost |
|---------|--------------|---------------|-----------|-----------|
| **Lightsail Container** | Micro (0.25 vCPU, 1GB) - 1 node | $10/month | ✅ FREE | **$0** |
| **Lightsail Database** | Micro (1 vCPU, 1GB, 40GB SSD) | $15/month | ✅ FREE | **$0** |
| **S3 Storage** | < 5GB | $0.12/month | ✅ FREE (12 months) | **$0** |
| **CloudFront** | < 100GB transfer | $8.50/month | ✅ FREE (12 months) | **$0** |
| **Cognito** | < 50 MAUs | $0/month | ✅ Always FREE | **$0** |
| **CloudWatch** | Basic monitoring | $0/month | ✅ Always FREE | **$0** |
| **SSM Parameters** | 4 parameters | $0/month | ✅ Always FREE | **$0** |
| | | | **TOTAL** | **$0.00/month** |

---

### Months 4-12 (Partial Free Tier)

| Service | Configuration | Your Cost |
|---------|--------------|-----------|
| **Lightsail Container** | Micro (0.25 vCPU, 1GB) - 1 node | **$10/month** |
| **Lightsail Database** | Micro (1 vCPU, 1GB, 40GB SSD) | **$15/month** |
| **S3 Storage** | < 5GB | **$0** (FREE until month 12) |
| **CloudFront** | < 100GB transfer | **$0** (FREE until month 12) |
| **Cognito** | < 50 MAUs | **$0** (Always FREE) |
| **CloudWatch** | Basic monitoring | **$0** (Always FREE) |
| **SSM Parameters** | 4 parameters | **$0** (Always FREE) |
| | **TOTAL** | **$25.00/month** |

---

### Month 13+ (No Free Tier)

| Service | Configuration | Your Cost |
|---------|--------------|-----------|
| **Lightsail Container** | Micro (0.25 vCPU, 1GB) - 1 node | **$10/month** |
| **Lightsail Database** | Micro (1 vCPU, 1GB, 40GB SSD) | **$15/month** |
| **S3 Storage** | < 5GB | **$0.12/month** |
| **CloudFront** | < 100GB transfer | **$8.50/month** |
| **Cognito** | < 50 MAUs | **$0** (Always FREE) |
| **CloudWatch** | Basic monitoring | **$0** (Always FREE) |
| **SSM Parameters** | 4 parameters | **$0** (Always FREE) |
| | **TOTAL** | **$33.62/month** |

---

## 📊 Year 1 Cost Summary

| Period | Monthly Cost | Duration | Total |
|--------|-------------|----------|-------|
| **Months 1-3** | $0.00 | 3 months | **$0.00** |
| **Months 4-12** | $25.00 | 9 months | **$225.00** |
| **Year 1 Total** | | 12 months | **$225.00** |

---

## 🎯 Current Configuration (All Stages)

### Development (dev)
```yaml
Container: Nano (0.25 vCPU, 512MB) - 1 node
  Cost: $7/month (no free tier for Nano)
  
Database: Micro (1 vCPU, 1GB, 40GB)
  Cost: $0 (months 1-3), $15/month (months 4+)
  
Monthly: $7 (months 1-3), $22 (months 4+)
```

### Staging (staging)
```yaml
Container: Micro (0.25 vCPU, 1GB) - 1 node
  Cost: $0 (months 1-3), $10/month (months 4+)
  
Database: Micro (1 vCPU, 1GB, 40GB)
  Cost: $0 (months 1-3), $15/month (months 4+)
  
Monthly: $0 (months 1-3), $25 (months 4+)
```

### Production (prod)
```yaml
Container: Micro (0.25 vCPU, 1GB) - 1 node
  Cost: $0 (months 1-3), $10/month (months 4+)
  
Database: Micro (1 vCPU, 1GB, 40GB)
  Cost: $0 (months 1-3), $15/month (months 4+)
  
Monthly: $0 (months 1-3), $25 (months 4+)
```

---

## 🚀 Scaling Options (When Needed)

### Container Service Sizes

| Size | vCPU | RAM | Nodes | Cost/Month | Use Case |
|------|------|-----|-------|------------|----------|
| **Nano** | 0.25 | 512MB | 1 | $7 | Dev/Testing |
| **Micro** ✅ | 0.25 | 1GB | 1 | $10 | **Current (FREE 3mo)** |
| Small | 0.5 | 2GB | 1 | $40 | Light production |
| Medium | 1 | 4GB | 1 | $80 | Medium production |
| Large | 2 | 8GB | 1 | $160 | Heavy production |

### Database Sizes

| Bundle | vCPU | RAM | Storage | Cost/Month | Use Case |
|--------|------|-----|---------|------------|----------|
| **Micro** ✅ | 1 | 1GB | 40GB | $15 | **Current (FREE 3mo)** |
| Small | 2 | 2GB | 60GB | $30 | Light production |
| Medium | 2 | 4GB | 120GB | $60 | Medium production |
| Large | 2 | 8GB | 240GB | $115 | Heavy production |

---

## 💡 Cost Optimization Tips

### 1. Maximize Free Tier
- ✅ Use Micro container (not Nano) to get 3 months free
- ✅ Use Micro database to get 3 months free
- ✅ Keep single node (multi-node doesn't qualify for free tier)

### 2. Monitor Usage
```bash
# Check Lightsail metrics
aws lightsail get-container-service-metric-data \
  --service-name veraproof-api-prod \
  --metric-name CPUUtilization \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

### 3. Set Up Billing Alerts
```bash
# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name veraproof-billing-alert \
  --alarm-description "Alert when bill exceeds $30" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 30 \
  --comparison-operator GreaterThanThreshold
```

### 4. Optimize Data Transfer
- ✅ Lightsail includes 1TB outbound data transfer
- ✅ CloudFront caching reduces origin requests
- ✅ Compress assets before upload

### 5. Database Optimization
- Use connection pooling (max 10 connections for Micro)
- Enable query caching
- Regular VACUUM and ANALYZE
- Monitor slow queries

---

## 📈 When to Scale Up

### Container Service
**Scale up when:**
- CPU utilization > 70% consistently
- Memory utilization > 80%
- Response time > 1 second
- Request queue building up

**Recommended upgrade path:**
- Micro → Small ($10 → $40)
- Small → Medium ($40 → $80)

### Database
**Scale up when:**
- CPU utilization > 70% consistently
- Storage > 80% full
- Connection pool exhausted
- Slow query performance

**Recommended upgrade path:**
- Micro → Small ($15 → $30)
- Small → Medium ($30 → $60)

---

## 🎉 Summary

**Your VeraProof AI deployment costs:**

- ✅ **Months 1-3:** $0/month (100% FREE)
- ✅ **Months 4-12:** $25/month
- ✅ **Year 1 Total:** $225
- ✅ **Month 13+:** $33.62/month

**vs. Original multi-stage RDS/Fargate setup:** $9,180/year

**You save:** $8,955 (97.5% savings!) 🎉

---

## 📞 Support

- **AWS Lightsail Docs:** https://lightsail.aws.amazon.com/ls/docs
- **Free Tier Details:** https://aws.amazon.com/lightsail/pricing/
- **Billing Console:** https://console.aws.amazon.com/billing/

---

## ⚠️ Important Notes

1. **Free tier is per AWS account** (not per service)
2. **Free tier starts from first resource creation** (not account creation)
3. **Only Micro sizes qualify** for free tier (Nano, Small, etc. don't)
4. **Single node only** for free tier (multi-node doesn't qualify)
5. **3 months from first use** (not calendar months)
6. **Monitor usage** to avoid surprise charges after free tier expires
