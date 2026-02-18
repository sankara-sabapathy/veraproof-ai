# CI/CD Pipeline - Docker & Deployment Explanation

## 🤔 Your Question: How Does Docker Work in GitHub Actions?

You asked: "In local you asked me to run Docker so that you can build the image and upload to Lightsail, but in CI/CD GitHub Actions pipeline how does this happen?"

Great question! Let me explain the differences and how it all works.

---

## 🏠 Local Deployment (Your Machine)

### Prerequisites
1. **Docker Desktop must be running** on your machine
2. AWS CLI installed and configured
3. Lightsail Control plugin installed

### How It Works

```powershell
# Step 1: Build Docker image locally
cd backend
docker build -t veraproof-api:latest .
```

**What happens:**
- Docker Desktop on your machine builds the image
- Uses your local CPU, RAM, and disk
- Creates a container image with all dependencies
- Tags it as `veraproof-api:latest`

```powershell
# Step 2: Push to Lightsail
aws lightsail push-container-image \
    --service-name veraproof-api-prod \
    --label veraproof-api \
    --image veraproof-api:latest \
    --region ap-south-1
```

**What happens:**
- AWS CLI uses the Lightsail Control plugin
- Compresses and uploads the image to Lightsail's private registry
- Lightsail assigns it a unique name like `:veraproof-api-prod.veraproof-api.1`

---

## ☁️ GitHub Actions CI/CD (Cloud)

### No Docker Desktop Needed!

GitHub Actions runners come with Docker pre-installed. Here's how it works:

### 1. GitHub Actions Runner Environment

```yaml
deploy-backend:
  name: Deploy Backend to Lightsail
  runs-on: ubuntu-latest  # ← This is a virtual machine in GitHub's cloud
```

**What you get:**
- Fresh Ubuntu Linux VM for each workflow run
- Docker Engine pre-installed (not Docker Desktop)
- 2-core CPU, 7GB RAM, 14GB SSD
- Pre-configured with common tools (git, curl, aws-cli, etc.)

### 2. Docker Build in GitHub Actions

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
```

**What this does:**
- Configures Docker Buildx (advanced build features)
- Enables multi-platform builds
- Optimizes caching for faster builds

```yaml
- name: Build Docker image
  run: |
    cd backend
    docker build -t veraproof-api:${{ github.sha }} .
```

**What happens:**
- Docker Engine on the GitHub runner builds the image
- Uses GitHub's infrastructure (CPU, RAM, disk)
- Tags with the git commit SHA for traceability
- Example: `veraproof-api:a1b2c3d4e5f6...`

### 3. Install Lightsail Control Plugin

```yaml
- name: Install Lightsail Control Plugin
  run: |
    curl "https://s3.us-west-2.amazonaws.com/lightsailctl/latest/linux-amd64/lightsailctl" -o "/usr/local/bin/lightsailctl"
    sudo chmod +x /usr/local/bin/lightsailctl
```

**What this does:**
- Downloads the Lightsail Control plugin for Linux
- Makes it executable
- Now AWS CLI can push images to Lightsail

### 4. Push to Lightsail

```yaml
- name: Push to Lightsail
  run: |
    aws lightsail push-container-image \
      --service-name veraproof-api-prod \
      --label veraproof-api \
      --image veraproof-api:${{ github.sha }} \
      --region ap-south-1
```

**What happens:**
- Same as local, but running on GitHub's infrastructure
- Uploads the image to Lightsail's private registry
- Returns the Lightsail image name

---

## 🔄 Complete Flow Comparison

### Local Deployment Flow

```
Your Machine
├── Docker Desktop (running)
├── Build image locally
│   └── Uses your CPU/RAM
├── Push to Lightsail
│   └── Uses your internet connection
└── Deploy to Lightsail
    └── Lightsail pulls image and runs container
```

### GitHub Actions Flow

```
GitHub Actions Runner (Cloud VM)
├── Docker Engine (pre-installed)
├── Build image on GitHub's infrastructure
│   └── Uses GitHub's CPU/RAM
├── Install Lightsail Control plugin
├── Push to Lightsail
│   └── Uses GitHub's fast internet
└── Deploy to Lightsail
    └── Lightsail pulls image and runs container
```

---

## 🎯 Key Differences

| Aspect | Local | GitHub Actions |
|--------|-------|----------------|
| **Docker** | Docker Desktop (manual install) | Docker Engine (pre-installed) |
| **Build Location** | Your machine | GitHub's cloud VM |
| **Build Resources** | Your CPU/RAM | GitHub's infrastructure |
| **Internet Speed** | Your connection | GitHub's fast connection |
| **Lightsail Plugin** | Manual install | Installed in workflow |
| **Triggered By** | Manual command | Git push to master |
| **Cost** | Free (uses your resources) | Free (GitHub Free tier: 2000 min/month) |

---

## 📦 Frontend Deployment

### Local

```powershell
# Build Angular app
cd partner-dashboard
npm ci
npm run build

# Upload to S3
aws s3 sync dist/partner-dashboard/browser s3://bucket-name/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

### GitHub Actions

```yaml
- name: Install dashboard dependencies
  run: |
    cd partner-dashboard
    npm ci

- name: Build dashboard
  run: |
    cd partner-dashboard
    npm run build

- name: Deploy dashboard to S3
  run: |
    aws s3 sync partner-dashboard/dist/partner-dashboard/browser \
      s3://${{ needs.deploy-infrastructure.outputs.dashboard-bucket }}/ \
      --delete

- name: Invalidate dashboard CloudFront cache
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ needs.deploy-infrastructure.outputs.dashboard-distribution }} \
      --paths "/*"
```

**Same steps, different environment!**

---

## 🔐 AWS Credentials

### Local
You set environment variables:
```powershell
$env:AWS_ACCESS_KEY_ID = "..."
$env:AWS_SECRET_ACCESS_KEY = "..."
$env:AWS_SESSION_TOKEN = "..."
```

### GitHub Actions
Stored as GitHub Secrets and injected:
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ap-south-1
```

---

## 🚀 Why GitHub Actions is Better for Production

### 1. **Consistency**
- Same environment every time
- No "works on my machine" issues
- Reproducible builds

### 2. **Automation**
- Triggers on git push
- No manual steps
- Runs tests before deployment

### 3. **Speed**
- Fast GitHub infrastructure
- Parallel job execution
- Cached dependencies

### 4. **Security**
- Secrets managed by GitHub
- No credentials on local machine
- Audit trail of all deployments

### 5. **Collaboration**
- Team can see deployment status
- Pull request checks
- Deployment history

---

## 🛠️ What We Fixed in the CI/CD Pipeline

### 1. **Docker Build**
✅ Added Docker Buildx setup for optimized builds
✅ Tagged images with commit SHA for traceability

### 2. **Lightsail Plugin**
✅ Automatically installs lightsailctl on GitHub runner
✅ No manual installation needed

### 3. **Database Password Encoding**
✅ URL-encodes special characters in password
✅ Prevents deployment failures

### 4. **Frontend Build Path**
✅ Uses correct Angular output path (`browser/` subdirectory)
✅ Syncs files to S3 root correctly

### 5. **CloudFront Invalidation**
✅ Invalidates cache after deployment
✅ Ensures users see latest version

### 6. **Deployment Verification**
✅ Waits for Lightsail deployment to become ACTIVE
✅ Runs smoke tests on all endpoints
✅ Provides deployment summary

---

## 📝 Summary

**Local Deployment:**
- You run Docker Desktop
- You build images on your machine
- You push to Lightsail manually
- Good for testing and development

**GitHub Actions CI/CD:**
- GitHub provides Docker Engine
- Builds happen on GitHub's infrastructure
- Automatic on git push to master
- Production-ready, automated, and reliable

**Both use the same AWS Lightsail commands** - the only difference is WHERE the Docker build happens and WHO triggers it!

---

## 🎓 Learning Resources

### Docker in GitHub Actions
- [GitHub Actions Runner Images](https://github.com/actions/runner-images)
- [Docker Build Action](https://github.com/docker/build-push-action)

### AWS Lightsail
- [Lightsail Container Services](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-container-services.html)
- [Lightsail Control Plugin](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-install-software.html)

### CI/CD Best Practices
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices-for-github-actions)
- [Docker Build Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Now you understand how Docker works in both environments! 🐳**
