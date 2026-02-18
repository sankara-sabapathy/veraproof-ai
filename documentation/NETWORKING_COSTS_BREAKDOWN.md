# VeraProof AI - Networking Costs Breakdown

## 🌐 Complete Networking Cost Analysis

This document provides a detailed breakdown of ALL networking-related costs in AWS for the VeraProof AI deployment.

---

## 📊 Networking Cost Summary

| Component | Free Tier | Cost (Minimal) | Cost (Production) |
|-----------|-----------|----------------|-------------------|
| **VPC** | Always FREE | $0.00 | $0.00 |
| **Subnets** | Always FREE | $0.00 | $0.00 |
| **Internet Gateway** | Always FREE | $0.00 | $0.00 |
| **Security Groups** | Always FREE | $0.00 | $0.00 |
| **Route Tables** | Always FREE | $0.00 | $0.00 |
| **NAT Gateway** | None | $0.00 (not used) | $32.85/month |
| **VPC Endpoints** | None | $0.00 (not used) | $21.90/month |
| **Data Transfer (Lightsail)** | 1TB/month (3 months) | $0.00 | $0.00 |
| **Data Transfer (Internet)** | 100GB/month | $0.00 | $9.00/month |
| **Data Transfer (Inter-AZ)** | None | $0.00 | $1.00/month |
| **Load Balancer** | None | $0.00 (built into Lightsail) | $22.27/month (ALB for Fargate) |
| **TOTAL** | | **$0.00/month** | **$80.95/month** |

---

## 1️⃣ VPC (Virtual Private Cloud)

### What It Is
Isolated virtual network for your AWS resources.

### Cost
```
✅ FREE - Always
```

### What's Included (FREE)
- VPC creation and management
- CIDR block allocation (10.0.0.0/16)
- DNS resolution
- DHCP options
- Network ACLs (unlimited)

### Our Configuration
```yaml
VPC:
  CIDR: 10.0.0.0/16
  DNS Hostnames: Enabled
  DNS Support: Enabled
  Tenancy: Default
  Cost: $0.00
```

---

## 2️⃣ Subnets

### What It Is
Subdivisions of VPC IP address range across availability zones.

### Cost
```
✅ FREE - Always
```

### Our Configuration
```yaml
Public Subnets:
  - Subnet 1: 10.0.1.0/24 (AZ-1)
  - Subnet 2: 10.0.2.0/24 (AZ-2)
  Cost: $0.00

Private Subnets:
  - Subnet 3: 10.0.3.0/24 (AZ-1)
  - Subnet 4: 10.0.4.0/24 (AZ-2)
  Cost: $0.00
```

**Note**: For POC, we use public subnets only to avoid NAT Gateway costs.

---

## 3️⃣ Internet Gateway (IGW)

### What It Is
Allows communication between VPC and the internet.

### Cost
```
✅ FREE - Always
```

### Data Transfer Costs
- **Inbound**: FREE (always)
- **Outbound**: See "Data Transfer" section below

### Our Configuration
```yaml
Internet Gateway:
  Attached to: VPC
  Routes: 0.0.0.0/0 → IGW
  Cost: $0.00
```

---

## 4️⃣ Security Groups

### What It Is
Virtual firewalls controlling inbound/outbound traffic.

### Cost
```
✅ FREE - Always (unlimited)
```

### Our Configuration
```yaml
API Security Group:
  Inbound:
    - Port 443 (HTTPS): 0.0.0.0/0
    - Port 80 (HTTP): 0.0.0.0/0
  Outbound: All traffic
  Cost: $0.00

Database Security Group:
  Inbound:
    - Port 5432 (PostgreSQL): From API SG only
  Outbound: None
  Cost: $0.00
```

---

## 5️⃣ Route Tables

### What It Is
Rules determining where network traffic is directed.

### Cost
```
✅ FREE - Always
```

### Our Configuration
```yaml
Public Route Table:
  Routes:
    - 10.0.0.0/16 → local
    - 0.0.0.0/0 → Internet Gateway
  Cost: $0.00

Private Route Table:
  Routes:
    - 10.0.0.0/16 → local
    - 0.0.0.0/0 → NAT Gateway (if used)
  Cost: $0.00
```

---

## 6️⃣ NAT Gateway (Optional - NOT RECOMMENDED FOR POC)

### What It Is
Allows private subnet resources to access internet while remaining private.

### Cost
```
❌ NOT FREE
```

### Pricing Breakdown
```
Hourly Charge: $0.045/hour
Monthly (730 hours): $32.85/month

Data Processing:
  First 10 TB: $0.045/GB
  Next 40 TB: $0.035/GB
  Over 50 TB: $0.025/GB

Example (100GB processed):
  100 GB × $0.045 = $4.50/month

TOTAL: $32.85 + $4.50 = $37.35/month
```

### Our Configuration
```yaml
POC (Recommended):
  NAT Gateway: NONE
  Use: Public subnets only
  Cost: $0.00

Production (Optional):
  NAT Gateway: 1 (single AZ)
  Data Processing: ~100GB/month
  Cost: $37.35/month
```

**💡 POC Recommendation**: Skip NAT Gateway, use public subnets. Save $37.35/month.

---

## 7️⃣ VPC Endpoints (Optional - NOT RECOMMENDED FOR POC)

### What It Is
Private connections to AWS services without using internet gateway.

### Cost
```
❌ NOT FREE
```

### Pricing Breakdown

#### Gateway Endpoints (FREE)
```
S3 Gateway Endpoint: $0.00
DynamoDB Gateway Endpoint: $0.00
```

#### Interface Endpoints (PAID)
```
Hourly Charge: $0.01/hour per endpoint
Monthly (730 hours): $7.30/endpoint

Data Processing: $0.01/GB

Example (3 endpoints, 100GB):
  3 endpoints × $7.30 = $21.90/month
  100 GB × $0.01 = $1.00/month
  TOTAL: $22.90/month
```

### Common Interface Endpoints
```yaml
ECR API Endpoint:
  Cost: $7.30/month + data processing

ECR Docker Endpoint:
  Cost: $7.30/month + data processing

Secrets Manager Endpoint:
  Cost: $7.30/month + data processing

Total (3 endpoints): $21.90/month + ~$1/month data
```

### Our Configuration
```yaml
POC (Recommended):
  VPC Endpoints: NONE
  Use: Public internet via IGW
  Cost: $0.00

Production (Optional):
  S3 Gateway Endpoint: FREE
  ECR API Endpoint: $7.30/month
  ECR Docker Endpoint: $7.30/month
  Total: $14.60/month + data
```

**💡 POC Recommendation**: Skip VPC Endpoints. Save $22.90/month.

---

## 8️⃣ Data Transfer Costs

### Overview
Data transfer is one of the most complex AWS pricing components.

### Pricing Rules

#### 1. Inbound Data Transfer
```
✅ FREE - Always
```
All data coming INTO AWS from internet is FREE.

#### 2. Outbound Data Transfer (Internet)

```
First 100 GB/month: FREE (always)
Next 10 TB/month: $0.09/GB
Next 40 TB/month: $0.085/GB
Next 100 TB/month: $0.07/GB
Over 150 TB/month: $0.05/GB
```

**Example Calculations:**

```
POC Usage (50 GB/month):
  50 GB < 100 GB free tier
  Cost: $0.00

Light Usage (200 GB/month):
  First 100 GB: $0.00 (free)
  Next 100 GB: 100 × $0.09 = $9.00
  Total: $9.00/month

Medium Usage (1 TB/month):
  First 100 GB: $0.00 (free)
  Next 900 GB: 900 × $0.09 = $81.00
  Total: $81.00/month
```

#### 3. Inter-AZ Data Transfer

```
Data between AZs: $0.01/GB (each direction)
```

**Example:**
```
Database Multi-AZ replication (100 GB/month):
  100 GB × $0.01 = $1.00/month
```

#### 4. Inter-Region Data Transfer

```
Between regions: $0.02/GB
```

**Not applicable for single-region POC.**

#### 5. Lightsail Data Transfer

```
✅ Included in Lightsail pricing:
  - 1 TB/month outbound (FREE for 3 months)
  - 1 TB/month outbound (included after)
```

**This is HUGE for POC!** Lightsail includes 1TB data transfer.

---

## 9️⃣ Load Balancer Costs

### Application Load Balancer (ALB) - ECS Fargate Only

```
Hourly Charge: $0.0225/hour
Monthly (730 hours): $16.43/month

LCU (Load Balancer Capacity Unit):
  $0.008 per LCU-hour
  
LCU Dimensions:
  - New connections/sec: 25
  - Active connections: 3,000
  - Processed bytes: 1 GB/hour
  - Rule evaluations: 1,000/sec

Typical POC Usage:
  ~1 LCU × 730 hours × $0.008 = $5.84/month

TOTAL: $16.43 + $5.84 = $22.27/month
```

### Lightsail Container Service (Built-in Load Balancing)

```
✅ Included in Lightsail Container pricing
Cost: $0.00 (no additional charge, no separate resource)

What's Included:
  - Load balancing across container instances
  - SSL/TLS certificate management
  - Health checks
  - HTTPS endpoint
  - Traffic distribution
```

**How it works:**
- Lightsail Container Service has built-in load balancing
- No separate load balancer resource is created
- When you scale to multiple nodes (scale=2+), traffic is automatically distributed
- For single node (scale=1), it still provides HTTPS endpoint and health checks

**💡 POC Recommendation**: Use Lightsail (load balancing built-in). Save $22.27/month vs separate ALB.

---

## 🔟 CloudFront Data Transfer

### What It Is
Content Delivery Network (CDN) for frontend assets.

### Cost

```
Free Tier (12 months):
  - 1 TB data transfer out
  - 10,000,000 HTTP/HTTPS requests
  - 2,000,000 CloudFront Function invocations

After Free Tier:
  Data Transfer Out (per GB):
    - First 10 TB: $0.085/GB
    - Next 40 TB: $0.080/GB
    - Next 100 TB: $0.060/GB
    - Over 150 TB: $0.025/GB
  
  HTTP/HTTPS Requests:
    - $0.0075 per 10,000 requests
```

### Our Configuration

```yaml
POC (Months 1-12):
  Data Transfer: < 100 GB/month
  Requests: < 1M/month
  Cost: $0.00 (within free tier)

After Free Tier (Month 13+):
  Data Transfer: 100 GB × $0.085 = $8.50
  Requests: 1M × $0.0075/10K = $0.75
  Total: $9.25/month
```

---

## 📊 Complete Networking Cost Scenarios

### Scenario 1: POC (Minimal - Recommended)

```yaml
Configuration:
  - Lightsail Container (includes 1TB transfer)
  - Public subnets only (no NAT)
  - No VPC endpoints
  - CloudFront (within free tier)
  - Single AZ

Monthly Costs:
  VPC: $0.00
  Subnets: $0.00
  Internet Gateway: $0.00
  Security Groups: $0.00
  NAT Gateway: $0.00 (not used)
  VPC Endpoints: $0.00 (not used)
  Data Transfer: $0.00 (within Lightsail 1TB)
  Load Balancer: $0.00 (included in Lightsail)
  CloudFront: $0.00 (within free tier)
  
TOTAL NETWORKING COST: $0.00/month
```

### Scenario 2: Production (Single AZ)

```yaml
Configuration:
  - Lightsail Container
  - Public subnets (no NAT)
  - No VPC endpoints
  - CloudFront (paid)
  - Single AZ

Monthly Costs:
  VPC: $0.00
  Subnets: $0.00
  Internet Gateway: $0.00
  Security Groups: $0.00
  NAT Gateway: $0.00 (not used)
  VPC Endpoints: $0.00 (not used)
  Data Transfer: $9.00 (200GB beyond free tier)
  Load Balancer: $0.00 (included in Lightsail)
  CloudFront: $9.25 (100GB + requests)
  
TOTAL NETWORKING COST: $18.25/month
```

### Scenario 3: Production (Multi-AZ with NAT)

```yaml
Configuration:
  - ECS Fargate
  - Private subnets with NAT Gateway
  - VPC endpoints (S3, ECR)
  - CloudFront (paid)
  - Multi-AZ

Monthly Costs:
  VPC: $0.00
  Subnets: $0.00
  Internet Gateway: $0.00
  Security Groups: $0.00
  NAT Gateway: $37.35 (1 gateway + 100GB)
  VPC Endpoints: $14.60 (2 interface endpoints)
  Data Transfer (Inter-AZ): $1.00 (Multi-AZ replication)
  Data Transfer (Internet): $9.00 (200GB)
  Load Balancer (ALB): $22.27
  CloudFront: $9.25
  
TOTAL NETWORKING COST: $93.47/month
```

---

## 💡 Cost Optimization Recommendations

### For POC (Months 1-12)

1. ✅ **Use Lightsail Container**
   - Includes 1TB data transfer
   - Includes load balancing
   - Includes SSL certificate
   - **Saves**: $22.27/month (ALB) + data transfer costs

2. ✅ **Use Public Subnets Only**
   - Skip NAT Gateway
   - **Saves**: $37.35/month

3. ✅ **Skip VPC Endpoints**
   - Use public internet via IGW
   - **Saves**: $22.90/month

4. ✅ **Stay Within CloudFront Free Tier**
   - Keep transfer < 1TB/month
   - Keep requests < 10M/month
   - **Saves**: $9.25/month (first 12 months)

5. ✅ **Single AZ Deployment**
   - No inter-AZ data transfer
   - **Saves**: $1.00/month

**Total Networking Savings: $92.77/month**

---

## 📈 Data Transfer Estimation

### Typical POC Usage

```yaml
Verification Session:
  Video Upload: 5 MB (250ms chunks × 20 seconds)
  IMU Data: 50 KB
  Optical Flow Results: 100 KB
  Total Upload: ~5.15 MB

  Results Download: 10 KB
  Dashboard Assets: 2 MB (first load)
  Total Download: ~2.01 MB

Per Session Total: ~7.16 MB

Monthly Estimate (100 sessions):
  100 sessions × 7.16 MB = 716 MB
  Well within 1TB Lightsail free transfer
  Well within 100GB AWS free tier
  
Cost: $0.00
```

### Production Usage

```yaml
Monthly Estimate (10,000 sessions):
  10,000 sessions × 7.16 MB = 71.6 GB
  Still within 100GB AWS free tier
  Still within 1TB Lightsail transfer
  
Cost: $0.00
```

### High Volume (100,000 sessions/month)

```yaml
Monthly Estimate:
  100,000 sessions × 7.16 MB = 716 GB
  
Breakdown:
  First 100 GB: $0.00 (free tier)
  Next 616 GB: 616 × $0.09 = $55.44
  
Cost: $55.44/month
```

---

## 🎯 Summary

### POC Networking Costs (Recommended Configuration)

| Component | Cost |
|-----------|------|
| VPC + Subnets + IGW | $0.00 |
| Security Groups | $0.00 |
| NAT Gateway | $0.00 (not used) |
| VPC Endpoints | $0.00 (not used) |
| Data Transfer | $0.00 (within free tiers) |
| Load Balancer | $0.00 (included in Lightsail) |
| CloudFront | $0.00 (within free tier) |
| **TOTAL** | **$0.00/month** |

### Key Takeaways

1. ✅ **Basic networking is FREE**: VPC, subnets, IGW, security groups
2. ✅ **Lightsail includes networking**: 1TB transfer + load balancing
3. ✅ **First 100GB internet transfer is FREE**: Sufficient for POC
4. ❌ **Avoid NAT Gateway for POC**: Costs $37.35/month
5. ❌ **Avoid VPC Endpoints for POC**: Costs $22.90/month
6. ✅ **CloudFront free tier**: 1TB transfer for 12 months

**Your POC networking cost: $0.00/month** 🎉
