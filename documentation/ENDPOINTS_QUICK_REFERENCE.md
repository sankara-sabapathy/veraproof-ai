# VeraProof AI - Endpoints Quick Reference Card

**Environment:** Production  
**Region:** ap-south-1 (Mumbai)  
**Account:** 612850243659

---

## 🌐 Live Endpoints

### Backend API
```
https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com
```

### Partner Dashboard
```
https://d3gc0en9my7apv.cloudfront.net
```

### Verification Interface (Mobile)
```
https://dmieqia655oqd.cloudfront.net
```

---

## ⚡ Quick Tests

### Test API Health
```bash
curl https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com/health
```

### Test Dashboard
```bash
curl -I https://d3gc0en9my7apv.cloudfront.net
```

### Test Verification
```bash
curl -I https://dmieqia655oqd.cloudfront.net
```

---

## 🔐 Authentication

**User Pool ID:** `ap-south-1_l4nlq0n8y`  
**Client ID:** `2b7tq4gj7426iamis9snrrh2fo`

---

## 📦 Infrastructure IDs

### Lightsail
- **Container Service:** `veraproof-api-prod`
- **Database:** `veraproof-db-prod`

### CloudFront
- **Dashboard:** `E22HOO32XSEYNN`
- **Verification:** `E3A2H3IT5ET3I0`

### S3 Buckets
- **Dashboard:** `veraproof-dashboard-prod-612850243659`
- **Verification:** `veraproof-verification-prod-612850243659`
- **Artifacts:** `veraproof-artifacts-prod-612850243659`
- **Branding:** `veraproof-branding-prod-612850243659`

---

## 🚀 Deployment Commands

### Local Deployment
```powershell
.\deploy-local.ps1
```

### Check Deployment Status
```bash
aws lightsail get-container-services --service-name veraproof-api-prod --region ap-south-1
```

### View Logs
```bash
aws lightsail get-container-log --service-name veraproof-api-prod --container-name app --region ap-south-1
```

### Invalidate Cache
```bash
# Dashboard
aws cloudfront create-invalidation --distribution-id E22HOO32XSEYNN --paths "/*"

# Verification
aws cloudfront create-invalidation --distribution-id E3A2H3IT5ET3I0 --paths "/*"
```

---

## 📊 Expected Responses

### API Health
```json
{"status":"healthy"}
```

### Dashboard
```
HTTP/1.1 200 OK
Content-Type: text/html
```

### Verification
```
HTTP/1.1 200 OK
Content-Type: text/html
```

---

**Save this for quick reference! 📌**
