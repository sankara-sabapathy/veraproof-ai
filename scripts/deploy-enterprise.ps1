#!/usr/bin/env pwsh
# Enterprise-Grade Deployment Script for VeraProof AI
# Handles cross-stack dependencies via SSM Parameter Store

param(
    [string]$Stage = "prod"
)

$Region = "ap-south-1"
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "VeraProof AI - Enterprise Deployment" -ForegroundColor Cyan
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
    exit 1
}

# Step 1: Deploy Infrastructure Stacks
Write-Host ""
Write-Host "=== Step 1: Deploying Infrastructure Stacks ===" -ForegroundColor Yellow
Set-Location infrastructure

# Install dependencies
if (!(Get-Command cdk -ErrorAction SilentlyContinue)) {
    Write-Host "Installing AWS CDK..." -ForegroundColor Yellow
    npm install -g aws-cdk
}
pip install -q -r requirements.txt

# Deploy all stacks
Write-Host "Deploying CDK stacks..." -ForegroundColor Yellow
cdk deploy --all `
    --context stage=$Stage `
    --context account=$AwsAccountId `
    --require-approval never `
    --outputs-file cdk-outputs.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "CDK deployment failed!" -ForegroundColor Red
    exit 1
}

# Extract outputs
$Outputs = Get-Content cdk-outputs.json | ConvertFrom-Json

# Frontend Stack Outputs
$DashboardUrl = $Outputs."Veraproof-Frontend-Stack-$Stage"."DashboardURL${Stage}"
$VerificationUrl = $Outputs."Veraproof-Frontend-Stack-$Stage"."VerificationURL${Stage}"
$DashboardBucket = $Outputs."Veraproof-Frontend-Stack-$Stage"."DashboardBucketName${Stage}"
$VerificationBucket = $Outputs."Veraproof-Frontend-Stack-$Stage"."VerificationBucketName${Stage}"
$DashboardDist = $Outputs."Veraproof-Frontend-Stack-$Stage"."DashboardDistributionID${Stage}"
$VerificationDist = $Outputs."Veraproof-Frontend-Stack-$Stage"."VerificationDistributionID${Stage}"

# Lightsail Stack Outputs
$LightsailService = $Outputs."Veraproof-Lightsail-Stack-$Stage"."LightsailContainerService${Stage}"
$ApiUrl = $Outputs."Veraproof-Lightsail-Stack-$Stage"."LightsailAPIURL${Stage}"

# Auth Stack Outputs
$UserPoolId = $Outputs."Veraproof-Auth-Stack-$Stage"."UserPoolID${Stage}"
$ClientId = $Outputs."Veraproof-Auth-Stack-$Stage"."UserPoolClientID${Stage}"
$CallbackUrls = $Outputs."Veraproof-Auth-Stack-$Stage"."CallbackURLs${Stage}"

Write-Host ""
Write-Host "Infrastructure Deployed Successfully!" -ForegroundColor Green
Write-Host "  Dashboard URL: $DashboardUrl" -ForegroundColor Cyan
Write-Host "  Verification URL: $VerificationUrl" -ForegroundColor Cyan
Write-Host "  API URL: https://$ApiUrl" -ForegroundColor Cyan
Write-Host "  User Pool ID: $UserPoolId" -ForegroundColor Cyan
Write-Host "  Callback URLs: $CallbackUrls" -ForegroundColor Cyan

Set-Location ..

# Step 2: Retrieve Configuration from SSM
Write-Host ""
Write-Host "=== Step 2: Retrieving Configuration from SSM ===" -ForegroundColor Yellow

$SsmDashboardUrl = aws ssm get-parameter `
    --name "/veraproof/$Stage/frontend/dashboard_url" `
    --region $Region `
    --query 'Parameter.Value' `
    --output text

$SsmVerificationUrl = aws ssm get-parameter `
    --name "/veraproof/$Stage/frontend/verification_url" `
    --region $Region `
    --query 'Parameter.Value' `
    --output text

$SsmApiUrl = aws ssm get-parameter `
    --name "/veraproof/$Stage/api/url" `
    --region $Region `
    --query 'Parameter.Value' `
    --output text

Write-Host "SSM Parameters Retrieved:" -ForegroundColor Green
Write-Host "  Dashboard: $SsmDashboardUrl" -ForegroundColor Cyan
Write-Host "  Verification: $SsmVerificationUrl" -ForegroundColor Cyan
Write-Host "  API: $SsmApiUrl" -ForegroundColor Cyan

# Step 3: Get Database Credentials
Write-Host ""
Write-Host "=== Step 3: Retrieving Database Credentials ===" -ForegroundColor Yellow

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

# Step 4: Build and Deploy Backend
Write-Host ""
Write-Host "=== Step 4: Building and Deploying Backend ===" -ForegroundColor Yellow
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

# URL encode password
$EncodedPassword = [System.Web.HttpUtility]::UrlEncode($DbPassword)

# Generate JWT secret
$JwtSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))

# Create deployment configuration with ALL required environment variables
Write-Host "Creating deployment configuration..." -ForegroundColor Yellow
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
                COGNITO_USER_POOL_ID = $UserPoolId
                COGNITO_CLIENT_ID = $ClientId
                
                # JWT
                JWT_SECRET = $JwtSecret
                JWT_ALGORITHM = "HS256"
                JWT_EXPIRATION_HOURS = "1"
                REFRESH_TOKEN_EXPIRATION_DAYS = "30"
                
                # Application URLs (from SSM)
                BACKEND_URL = $SsmApiUrl
                FRONTEND_DASHBOARD_URL = $SsmDashboardUrl
                FRONTEND_VERIFICATION_URL = $SsmVerificationUrl
                
                # CORS - Production CloudFront URLs + Local
                CORS_ORIGINS = "$SsmDashboardUrl,$SsmVerificationUrl,http://localhost:4200,http://localhost:3000"
                
                # Rate Limiting
                MAX_CONCURRENT_SESSIONS = "10"
                API_RATE_LIMIT_PER_MINUTE = "100"
                
                # Session Management
                SESSION_EXPIRATION_MINUTES = "15"
                SESSION_EXTENSION_MINUTES = "10"
                
                # Storage
                ARTIFACT_RETENTION_DAYS = "90"
                SIGNED_URL_EXPIRATION_SECONDS = "3600"
                
                # Mock Services
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

$JsonContent = $DeploymentConfig | ConvertTo-Json -Depth 10 -Compress
$JsonContent | Out-File -FilePath deployment.json -Encoding UTF8 -NoNewline

Write-Host "Deploying to Lightsail..." -ForegroundColor Yellow
aws lightsail create-container-service-deployment `
    --service-name $LightsailService `
    --cli-input-json $JsonContent `
    --region $Region

Write-Host "Waiting for deployment..." -ForegroundColor Yellow
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

# Step 5: Update Frontend Environment Configuration
Write-Host ""
Write-Host "=== Step 5: Updating Frontend Configuration ===" -ForegroundColor Yellow

# Create production environment file with SSM values
$FrontendEnvContent = @"
export const environment = {
  production: true,
  apiUrl: '$SsmApiUrl',
  cognito: {
    userPoolId: '$UserPoolId',
    clientId: '$ClientId',
    region: '$Region'
  }
};
"@

$FrontendEnvContent | Out-File -FilePath "partner-dashboard/src/environments/environment.prod.ts" -Encoding UTF8

Write-Host "Frontend environment updated" -ForegroundColor Green

# Step 6: Build and Deploy Frontend
Write-Host ""
Write-Host "=== Step 6: Building and Deploying Frontend ===" -ForegroundColor Yellow
Set-Location partner-dashboard

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci

Write-Host "Building dashboard..." -ForegroundColor Yellow
npm run build -- --configuration=production

Write-Host "Deploying to S3..." -ForegroundColor Yellow
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

# Step 7: Deploy Verification Interface
Write-Host ""
Write-Host "=== Step 7: Deploying Verification Interface ===" -ForegroundColor Yellow

if (Test-Path "verification-interface") {
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
    
    aws cloudfront create-invalidation `
        --distribution-id $VerificationDist `
        --paths "/*"
    
    Write-Host "Verification interface deployed" -ForegroundColor Green
} else {
    Write-Host "Warning: verification-interface not found" -ForegroundColor Yellow
}

# Step 8: Verification
Write-Host ""
Write-Host "=== Step 8: Running Verification Tests ===" -ForegroundColor Yellow

Start-Sleep -Seconds 30

Write-Host "Testing API health..." -ForegroundColor Yellow
try {
    $Response = Invoke-RestMethod -Uri "$SsmApiUrl/health"
    Write-Host "✓ API Health: $($Response.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ API Health check failed" -ForegroundColor Red
}

Write-Host "Testing Dashboard..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri $SsmDashboardUrl -UseBasicParsing
    Write-Host "✓ Dashboard: $($Response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Dashboard check failed" -ForegroundColor Red
}

Write-Host "Testing Verification Interface..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri $SsmVerificationUrl -UseBasicParsing
    Write-Host "✓ Verification: $($Response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Verification check failed" -ForegroundColor Red
}

# Final Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor Yellow
Write-Host "  API: $SsmApiUrl" -ForegroundColor White
Write-Host "  Dashboard: $SsmDashboardUrl" -ForegroundColor White
Write-Host "  Verification: $SsmVerificationUrl" -ForegroundColor White
Write-Host ""
Write-Host "Cognito:" -ForegroundColor Yellow
Write-Host "  User Pool: $UserPoolId" -ForegroundColor White
Write-Host "  Client ID: $ClientId" -ForegroundColor White
Write-Host "  Callback URLs: $CallbackUrls" -ForegroundColor White
Write-Host ""
Write-Host "Configuration stored in SSM Parameter Store:" -ForegroundColor Yellow
Write-Host "  /veraproof/$Stage/frontend/dashboard_url" -ForegroundColor White
Write-Host "  /veraproof/$Stage/frontend/verification_url" -ForegroundColor White
Write-Host "  /veraproof/$Stage/api/url" -ForegroundColor White
Write-Host "  /veraproof/$Stage/cognito/user_pool_id" -ForegroundColor White
Write-Host "  /veraproof/$Stage/cognito/client_id" -ForegroundColor White
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
