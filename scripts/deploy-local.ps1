#!/usr/bin/env pwsh
# Local Deployment Script for VeraProof AI (PowerShell)
# Mirrors the CI/CD pipeline for local deployments

param(
    [string]$Stage = "prod"
)

$Region = "ap-south-1"
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "VeraProof AI - Local Deployment" -ForegroundColor Cyan
Write-Host "Stage: $Stage" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check AWS credentials
try {
    $CallerIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $AwsAccountId = $CallerIdentity.Account
    Write-Host "AWS Account: $AwsAccountId" -ForegroundColor Green
} catch {
    Write-Host "Error: AWS credentials not configured" -ForegroundColor Red
    Write-Host "Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN" -ForegroundColor Yellow
    exit 1
}

# Step 1: Deploy Infrastructure
Write-Host ""
Write-Host "=== Step 1: Deploying Infrastructure ===" -ForegroundColor Yellow
Set-Location infrastructure

# Install CDK if not already installed
if (!(Get-Command cdk -ErrorAction SilentlyContinue)) {
    Write-Host "Installing AWS CDK..." -ForegroundColor Yellow
    npm install -g aws-cdk
}

# Install Python dependencies
pip install -r requirements.txt

# Deploy all stacks
Write-Host "Deploying CDK stacks..." -ForegroundColor Yellow
cdk deploy --all `
    --context stage=$Stage `
    --context account=$AwsAccountId `
    --require-approval never `
    --outputs-file cdk-outputs.json

# Extract outputs
$Outputs = Get-Content cdk-outputs.json | ConvertFrom-Json
$LightsailService = $Outputs."Veraproof-Lightsail-Stack-$Stage"."LightsailContainerService${Stage}"
$DashboardBucket = $Outputs."Veraproof-Frontend-Stack-$Stage"."DashboardBucketName${Stage}"
$VerificationBucket = $Outputs."Veraproof-Frontend-Stack-$Stage"."VerificationBucketName${Stage}"
$DashboardDist = $Outputs."Veraproof-Frontend-Stack-$Stage"."DashboardDistributionID${Stage}"
$VerificationDist = $Outputs."Veraproof-Frontend-Stack-$Stage"."VerificationDistributionID${Stage}"
$DashboardUrl = $Outputs."Veraproof-Frontend-Stack-$Stage"."DashboardURL${Stage}"
$VerificationUrl = $Outputs."Veraproof-Frontend-Stack-$Stage"."VerificationURL${Stage}"

Write-Host "Lightsail Service: $LightsailService" -ForegroundColor Green
Write-Host "Dashboard Bucket: $DashboardBucket" -ForegroundColor Green
Write-Host "Dashboard URL: $DashboardUrl" -ForegroundColor Green
Write-Host "Verification Bucket: $VerificationBucket" -ForegroundColor Green
Write-Host "Verification URL: $VerificationUrl" -ForegroundColor Green

Set-Location ..

# Step 2: Get Database Credentials
Write-Host ""
Write-Host "=== Step 2: Retrieving Database Credentials ===" -ForegroundColor Yellow
$DbPasswordInfo = aws lightsail get-relational-database-master-user-password `
    --relational-database-name "veraproof-db-$Stage" `
    --region $Region `
    --output json | ConvertFrom-Json

$DbInfo = aws lightsail get-relational-database `
    --relational-database-name "veraproof-db-$Stage" `
    --region $Region `
    --output json | ConvertFrom-Json

$DbPassword = $DbPasswordInfo.masterUserPassword
$DbEndpoint = $DbInfo.relationalDatabase.masterEndpoint.address

Write-Host "Database Endpoint: $DbEndpoint" -ForegroundColor Green
Write-Host "Database Password: [MASKED]" -ForegroundColor Green

# Step 3: Build and Deploy Backend
Write-Host ""
Write-Host "=== Step 3: Building and Deploying Backend ===" -ForegroundColor Yellow
Set-Location backend

Write-Host "Building Docker image..." -ForegroundColor Yellow
docker build -t veraproof-api:latest .

Write-Host "Pushing to Lightsail..." -ForegroundColor Yellow
aws lightsail push-container-image `
    --service-name $LightsailService `
    --label veraproof-api `
    --image veraproof-api:latest `
    --region $Region `
    --output json | Out-File -FilePath push-output.json

$PushOutput = Get-Content push-output.json | ConvertFrom-Json
$ImageName = $PushOutput.containerImage.image
Write-Host "Image pushed: $ImageName" -ForegroundColor Green

# URL encode the database password
Write-Host "Encoding database password..." -ForegroundColor Yellow
$EncodedPassword = [System.Web.HttpUtility]::UrlEncode($DbPassword)

# Generate JWT secret if not provided
$JwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))

# Get Lightsail API URL
$ServiceInfo = aws lightsail get-container-services `
    --service-name $LightsailService `
    --region $Region `
    --output json | ConvertFrom-Json
$ApiUrl = $ServiceInfo.containerServices[0].url

Write-Host "API URL: https://$ApiUrl" -ForegroundColor Green

# Create deployment configuration with CORS
Write-Host "Creating deployment configuration with CORS..." -ForegroundColor Yellow
$DeploymentConfig = @{
    containers = @{
        app = @{
            image = $ImageName
            ports = @{
                "8000" = "HTTP"
            }
            environment = @{
                # Stage and Region
                STAGE = $Stage
                ENVIRONMENT = "production"
                AWS_REGION = $Region
                
                # Database
                DATABASE_URL = "postgresql://veraproof_admin:${EncodedPassword}@${DbEndpoint}:5432/veraproof"
                
                # AWS Resources
                ARTIFACTS_BUCKET = "veraproof-artifacts-$Stage-$AwsAccountId"
                BRANDING_BUCKET = "veraproof-branding-$Stage-$AwsAccountId"
                
                # Cognito
                COGNITO_USER_POOL_ID = "ap-south-1_l4nlq0n8y"
                COGNITO_CLIENT_ID = "2b7tq4gj7426iamis9snrrh2fo"
                
                # JWT
                JWT_SECRET = $JwtSecret
                JWT_ALGORITHM = "HS256"
                JWT_EXPIRATION_HOURS = "1"
                REFRESH_TOKEN_EXPIRATION_DAYS = "30"
                
                # Application URLs
                BACKEND_URL = "https://$ApiUrl"
                FRONTEND_DASHBOARD_URL = $DashboardUrl
                FRONTEND_VERIFICATION_URL = $VerificationUrl
                
                # CORS - Include production CloudFront URLs
                CORS_ORIGINS = "$DashboardUrl,$VerificationUrl,http://localhost:4200,http://localhost:3000"
                
                # Rate Limiting & Sessions
                MAX_CONCURRENT_SESSIONS = "10"
                API_RATE_LIMIT_PER_MINUTE = "100"
                SESSION_EXPIRATION_MINUTES = "15"
                SESSION_EXTENSION_MINUTES = "10"
                
                # Storage
                ARTIFACT_RETENTION_DAYS = "90"
                SIGNED_URL_EXPIRATION_SECONDS = "3600"
                
                # Mock Services (for development)
                USE_MOCK_SAGEMAKER = "true"
                USE_MOCK_RAZORPAY = "true"
                USE_LOCAL_AUTH = "true"
            }
        }
    }
    publicEndpoint = @{
        containerName = "app"
        containerPort = 8000
        healthCheck = @{
            path = "/health"
            intervalSeconds = 30
            timeoutSeconds = 5
            healthyThreshold = 2
            unhealthyThreshold = 2
            successCodes = "200"
        }
    }
}

# Convert to JSON with proper encoding
$JsonContent = $DeploymentConfig | ConvertTo-Json -Depth 10 -Compress
$JsonContent | Out-File -FilePath deployment.json -Encoding UTF8 -NoNewline

Write-Host "Deploying to Lightsail..." -ForegroundColor Yellow
aws lightsail create-container-service-deployment `
    --service-name $LightsailService `
    --cli-input-json $JsonContent `
    --region $Region

Write-Host "Waiting for deployment to become active..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    $ServiceInfo = aws lightsail get-container-services `
        --service-name $LightsailService `
        --region $Region `
        --output json | ConvertFrom-Json
    
    $State = $ServiceInfo.containerServices[0].currentDeployment.state
    Write-Host "Deployment state: $State (attempt $i/30)" -ForegroundColor Cyan
    
    if ($State -eq "ACTIVE") {
        Write-Host "Backend deployment successful!" -ForegroundColor Green
        break
    } elseif ($State -eq "FAILED") {
        Write-Host "Backend deployment failed!" -ForegroundColor Red
        exit 1
    }
    
    Start-Sleep -Seconds 20
}

Set-Location ..

# Step 4: Build and Deploy Frontend
Write-Host ""
Write-Host "=== Step 4: Building and Deploying Frontend ===" -ForegroundColor Yellow
Set-Location partner-dashboard

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci

Write-Host "Building dashboard..." -ForegroundColor Yellow
npm run build

Write-Host "Deploying dashboard to S3..." -ForegroundColor Yellow
aws s3 sync dist/partner-dashboard/browser `
    s3://$DashboardBucket/ `
    --delete `
    --cache-control "public, max-age=31536000, immutable" `
    --exclude "index.html" `
    --exclude "*.json"

aws s3 sync dist/partner-dashboard/browser `
    s3://$DashboardBucket/ `
    --cache-control "no-cache, no-store, must-revalidate" `
    --include "index.html" `
    --include "*.json"

Write-Host "Invalidating CloudFront cache..." -ForegroundColor Yellow
aws cloudfront create-invalidation `
    --distribution-id $DashboardDist `
    --paths "/*"

Set-Location ..

# Step 5: Deploy Verification Page
Write-Host ""
Write-Host "=== Step 5: Deploying Verification Page ===" -ForegroundColor Yellow
if (Test-Path "verification-interface") {
    Write-Host "Deploying verification page to S3..." -ForegroundColor Yellow
    aws s3 sync verification-interface `
        s3://$VerificationBucket/ `
        --delete `
        --cache-control "public, max-age=31536000, immutable" `
        --exclude "index.html" `
        --exclude "README.md"
    
    aws s3 sync verification-interface `
        s3://$VerificationBucket/ `
        --cache-control "no-cache, no-store, must-revalidate" `
        --include "index.html"
    
    Write-Host "Invalidating CloudFront cache..." -ForegroundColor Yellow
    aws cloudfront create-invalidation `
        --distribution-id $VerificationDist `
        --paths "/*"
} else {
    Write-Host "Warning: verification-interface directory not found, skipping..." -ForegroundColor Yellow
}

# Step 6: Get API URL and Test
Write-Host ""
Write-Host "=== Step 6: Testing Deployment ===" -ForegroundColor Yellow
$ServiceInfo = aws lightsail get-container-services `
    --service-name $LightsailService `
    --region $Region `
    --output json | ConvertFrom-Json

$ApiUrl = $ServiceInfo.containerServices[0].url

$DashboardUrl = aws cloudformation describe-stacks `
    --stack-name "Veraproof-Frontend-Stack-$Stage" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='DashboardURLprod'].OutputValue" `
    --output text

$VerificationUrl = aws cloudformation describe-stacks `
    --stack-name "Veraproof-Frontend-Stack-$Stage" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='VerificationURLprod'].OutputValue" `
    --output text

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API URL: https://$ApiUrl" -ForegroundColor Green
Write-Host "Dashboard URL: $DashboardUrl" -ForegroundColor Green
Write-Host "Verification URL: $VerificationUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Testing API health endpoint..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "https://$ApiUrl/health" -UseBasicParsing
    Write-Host "API health check passed" -ForegroundColor Green
} catch {
    Write-Host "API health check failed (may still be starting up)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait 2-3 minutes for CloudFront cache invalidation" -ForegroundColor White
Write-Host "2. Test dashboard: $DashboardUrl" -ForegroundColor White
Write-Host "3. Test verification: $VerificationUrl" -ForegroundColor White
Write-Host "4. Monitor logs in CloudWatch: /aws/lightsail/$LightsailService" -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
