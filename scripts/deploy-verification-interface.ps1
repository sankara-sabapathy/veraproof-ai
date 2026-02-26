# Deploy Verification Interface to S3/CloudFront
# This script:
# 1. Gets the API URL from CDK outputs
# 2. Generates config.js from template
# 3. Uploads to S3
# 4. Invalidates CloudFront cache

param(
    [Parameter(Mandatory=$false)]
    [string]$Stage = "prod",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = ""
)

Write-Host "Deploying Verification Interface - Stage: $Stage" -ForegroundColor Green

# Get API URL from CDK outputs if not provided
if ([string]::IsNullOrEmpty($ApiUrl)) {
    Write-Host "Fetching API URL from CDK outputs..." -ForegroundColor Cyan
    
    $cdkOutputs = Get-Content "infrastructure/cdk-outputs.json" | ConvertFrom-Json
    $stackName = "Veraproof-Lightsail-Stack-$Stage"
    
    if ($cdkOutputs.$stackName) {
        $ApiUrl = $cdkOutputs.$stackName."Lightsail-API-URL-$Stage"
        Write-Host "API URL: $ApiUrl" -ForegroundColor Yellow
    } else {
        Write-Host "Error: Could not find API URL in CDK outputs" -ForegroundColor Red
        Write-Host "Please provide API URL manually with -ApiUrl parameter" -ForegroundColor Red
        exit 1
    }
}

# Get version (git commit hash or timestamp)
if ([string]::IsNullOrEmpty($Version)) {
    try {
        $Version = git rev-parse --short HEAD
    } catch {
        $Version = Get-Date -Format "yyyyMMdd-HHmmss"
    }
}

Write-Host "Version: $Version" -ForegroundColor Yellow

# Generate config.js from template
Write-Host "`nGenerating config.js..." -ForegroundColor Cyan

$templatePath = "verification-interface/config.template.js"
$configPath = "verification-interface/config.js"

$template = Get-Content $templatePath -Raw
$config = $template `
    -replace '{{API_URL}}', "https://$ApiUrl" `
    -replace '{{ENVIRONMENT}}', $Stage `
    -replace '{{VERSION}}', $Version

Set-Content -Path $configPath -Value $config

Write-Host "✓ config.js generated" -ForegroundColor Green

# Get S3 bucket name from CDK outputs
Write-Host "`nFetching S3 bucket name..." -ForegroundColor Cyan

$bucketName = $cdkOutputs."Veraproof-Frontend-Stack-$Stage"."Verification-Bucket-Name-$Stage"
$distributionId = $cdkOutputs."Veraproof-Frontend-Stack-$Stage"."Verification-Distribution-ID-$Stage"

Write-Host "Bucket: $bucketName" -ForegroundColor Yellow
Write-Host "Distribution: $distributionId" -ForegroundColor Yellow

# Sync to S3 (excluding cert-helper.html in production)
Write-Host "`nUploading to S3..." -ForegroundColor Cyan

if ($Stage -eq "prod" -or $Stage -eq "staging") {
    # Production: exclude development files
    aws s3 sync verification-interface/ s3://$bucketName/ `
        --exclude "*.md" `
        --exclude "cert-helper.html" `
        --exclude "config.template.js" `
        --exclude ".git*" `
        --delete
} else {
    # Development: include all files
    aws s3 sync verification-interface/ s3://$bucketName/ `
        --exclude "*.md" `
        --exclude "config.template.js" `
        --exclude ".git*" `
        --delete
}

Write-Host "✓ Files uploaded to S3" -ForegroundColor Green

# Invalidate CloudFront cache
Write-Host "`nInvalidating CloudFront cache..." -ForegroundColor Cyan

aws cloudfront create-invalidation `
    --distribution-id $distributionId `
    --paths "/*"

Write-Host "✓ CloudFront cache invalidated" -ForegroundColor Green

# Get CloudFront URL
$verificationUrl = $cdkOutputs."Veraproof-Frontend-Stack-$Stage"."Verification-URL-$Stage"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Verification Interface: $verificationUrl" -ForegroundColor Cyan
Write-Host "API URL: https://$ApiUrl" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
