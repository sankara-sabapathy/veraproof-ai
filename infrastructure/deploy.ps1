# VeraProof AI - AWS CDK Deployment Script (PowerShell) - Lightsail Only
# Usage: .\deploy.ps1 -Account <account_id> [-Stage <stage>]
# Example: .\deploy.ps1 -Account 123456789012 -Stage prod
# Example: .\deploy.ps1 -Account 123456789012 -Stage dev

param(
    [Parameter(Mandatory=$true)]
    [string]$Account,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Stage = "prod"  # Default to prod
)

$ErrorActionPreference = "Stop"
$Region = "ap-south-1"

Write-Host "=========================================" -ForegroundColor Green
Write-Host "VeraProof AI - Lightsail Deployment" -ForegroundColor Green
Write-Host "Stage: $Stage" -ForegroundColor Cyan
Write-Host "Account: $Account" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Bootstrap CDK (if not already done)
Write-Host "`n🔧 Bootstrapping CDK..." -ForegroundColor Yellow
cdk bootstrap "aws://$Account/$Region" --context stage=$Stage

# Synthesize CloudFormation templates
Write-Host "`n🔨 Synthesizing CloudFormation templates..." -ForegroundColor Yellow
cdk synth --context stage=$Stage --context account=$Account

# Deploy all stacks
Write-Host "`n☁️  Deploying infrastructure..." -ForegroundColor Yellow
cdk deploy --all `
    --context stage=$Stage `
    --context account=$Account `
    --require-approval never `
    --progress events `
    --outputs-file cdk-outputs.json

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Display important outputs
Write-Host "`n🔗 Fetching deployment outputs..." -ForegroundColor Cyan
Write-Host ""
.\show-outputs.ps1 -Stage $Stage

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Get database password from Lightsail console"
Write-Host "2. Build and push Docker image to Lightsail"
Write-Host "   cd backend; docker build -t veraproof-backend:latest ."
Write-Host "   aws lightsail push-container-image --service-name veraproof-api-$Stage --label veraproof-backend --image veraproof-backend:latest --region $Region"
Write-Host "3. Deploy frontend assets to S3"
Write-Host "4. Initialize database schema"
Write-Host ""
