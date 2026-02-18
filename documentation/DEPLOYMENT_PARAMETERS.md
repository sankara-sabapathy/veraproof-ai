# VeraProof AI - Deployment Parameters

## Required Parameters for Local AWS Deployment

### 1. AWS Session Credentials

```bash
# Set these environment variables
export AWS_ACCESS_KEY_ID="ASIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
export AWS_REGION="ap-south-1"
```

**Or using AWS CLI:**
```bash
aws configure set aws_access_key_id ASIA...
aws configure set aws_secret_access_key ...
aws configure set aws_session_token ...
aws configure set region ap-south-1
```

**Verify credentials:**
```bash
aws sts get-caller-identity
```

---

### 2. AWS Account ID

Your 12-digit AWS Account ID (e.g., `123456789012`)

**Get it from:**
```bash
aws sts get-caller-identity --query Account --output text
```

---

### 3. SSM Parameters (Must Create Before Deployment)

Create these 4 secure parameters in AWS SSM Parameter Store:

```bash
/veraproof/prod/database/password  (SecureString)
/veraproof/prod/jwt/secret-key     (SecureString)
/veraproof/prod/api-keys/salt      (SecureString)
/veraproof/prod/webhook/secret     (SecureString)
```

**Quick Setup:**
```bash
cd scripts
./setup-ssm-parameters.sh prod ap-south-1
```

**Manual Creation:**
```bash
# Database password
aws ssm put-parameter \
  --name "/veraproof/prod/database/password" \
  --value "$(openssl rand -base64 32)" \
  --type "SecureString" \
  --region ap-south-1

# JWT secret
aws ssm put-parameter \
  --name "/veraproof/prod/jwt/secret-key" \
  --value "$(openssl rand -hex 64)" \
  --type "SecureString" \
  --region ap-south-1

# API keys salt
aws ssm put-parameter \
  --name "/veraproof/prod/api-keys/salt" \
  --value "$(openssl rand -hex 32)" \
  --type "SecureString" \
  --region ap-south-1

# Webhook secret
aws ssm put-parameter \
  --name "/veraproof/prod/webhook/secret" \
  --value "$(openssl rand -hex 32)" \
  --type "SecureString" \
  --region ap-south-1
```

---

### 4. CDK Bootstrap (One-Time Setup)

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-south-1
```

---

## Deployment Command

Once all parameters are set:

```bash
cd infrastructure
./deploy.sh YOUR_ACCOUNT_ID lightsail
```

**Example:**
```bash
cd infrastructure
./deploy.sh 123456789012 lightsail
```

---

## Parameter Checklist

Before running deployment, verify:

- [ ] AWS credentials configured (access key, secret key, session token)
- [ ] AWS Account ID obtained
- [ ] AWS Region set to `ap-south-1`
- [ ] SSM parameters created (4 parameters)
- [ ] CDK bootstrapped for account/region
- [ ] Docker Desktop running (for backend deployment)
- [ ] Node.js 18+ installed
- [ ] Python 3.12+ installed
- [ ] AWS CDK installed (`npm install -g aws-cdk`)

---

## Quick Verification

```bash
# 1. Check AWS credentials
aws sts get-caller-identity

# 2. Check SSM parameters exist
aws ssm get-parameter --name /veraproof/prod/database/password --region ap-south-1
aws ssm get-parameter --name /veraproof/prod/jwt/secret-key --region ap-south-1
aws ssm get-parameter --name /veraproof/prod/api-keys/salt --region ap-south-1
aws ssm get-parameter --name /veraproof/prod/webhook/secret --region ap-south-1

# 3. Check CDK bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit --region ap-south-1

# 4. Check Docker
docker ps
```

---

## Summary

**Minimum Required:**
1. AWS Session Credentials (3 values)
2. AWS Account ID (1 value)
3. SSM Parameters (4 parameters)
4. CDK Bootstrap (one-time)

**Total Setup Time:** ~5 minutes

**Deployment Time:** ~30-40 minutes
