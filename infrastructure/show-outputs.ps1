# VeraProof AI - Display Deployment Outputs (PowerShell)
# Usage: .\show-outputs.ps1 [-Stage <stage>]
# Example: .\show-outputs.ps1 -Stage prod

param(
    [Parameter(Mandatory=$false)]
    [string]$Stage = "prod"
)

$Region = "ap-south-1"

Write-Host "=========================================" -ForegroundColor Green
Write-Host "VeraProof AI - Deployment Outputs" -ForegroundColor Green
Write-Host "Stage: $Stage" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Function to get CloudFormation output
function Get-StackOutput {
    param($StackName, $OutputKey)
    try {
        $output = aws cloudformation describe-stacks `
            --stack-name $StackName `
            --query "Stacks[0].Outputs[?OutputKey=='$OutputKey'].OutputValue" `
            --output text `
            --region $Region 2>$null
        return $output
    } catch {
        return "N/A"
    }
}

# Lightsail Stack Outputs
Write-Host "🚀 LIGHTSAIL INFRASTRUCTURE" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
$ApiUrl = Get-StackOutput "Veraproof-Lightsail-Stack-$Stage" "Lightsail-API-URL-$Stage"
$ContainerService = Get-StackOutput "Veraproof-Lightsail-Stack-$Stage" "Lightsail-Container-Service-$Stage"
$DbName = Get-StackOutput "Veraproof-Lightsail-Stack-$Stage" "Lightsail-Database-Name-$Stage"
$DbEndpoint = Get-StackOutput "Veraproof-Lightsail-Stack-$Stage" "Lightsail-Database-Endpoint-$Stage"
$DbPort = Get-StackOutput "Veraproof-Lightsail-Stack-$Stage" "Lightsail-Database-Port-$Stage"

Write-Host "API URL:              $ApiUrl"
Write-Host "Container Service:    $ContainerService"
Write-Host "Database Name:        $DbName"
Write-Host "Database Endpoint:    $DbEndpoint"
Write-Host "Database Port:        $DbPort"
Write-Host ""

# Frontend Stack Outputs
Write-Host "🌐 FRONTEND (CloudFront + S3)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
$DashboardUrl = Get-StackOutput "Veraproof-Frontend-Stack-$Stage" "Dashboard-URL-$Stage"
$VerificationUrl = Get-StackOutput "Veraproof-Frontend-Stack-$Stage" "Verification-URL-$Stage"
$DashboardBucket = Get-StackOutput "Veraproof-Frontend-Stack-$Stage" "Dashboard-Bucket-Name-$Stage"
$VerificationBucket = Get-StackOutput "Veraproof-Frontend-Stack-$Stage" "Verification-Bucket-Name-$Stage"
$DashboardDistId = Get-StackOutput "Veraproof-Frontend-Stack-$Stage" "Dashboard-Distribution-ID-$Stage"
$VerificationDistId = Get-StackOutput "Veraproof-Frontend-Stack-$Stage" "Verification-Distribution-ID-$Stage"

Write-Host "Dashboard URL:        $DashboardUrl"
Write-Host "Verification URL:     $VerificationUrl"
Write-Host "Dashboard Bucket:     $DashboardBucket"
Write-Host "Verification Bucket:  $VerificationBucket"
Write-Host "Dashboard Dist ID:    $DashboardDistId"
Write-Host "Verification Dist ID: $VerificationDistId"
Write-Host ""

# Storage Stack Outputs
Write-Host "📦 STORAGE (S3 Buckets)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
$ArtifactsBucket = Get-StackOutput "Veraproof-Storage-Stack-$Stage" "Artifacts-Bucket-Name-$Stage"
$BrandingBucket = Get-StackOutput "Veraproof-Storage-Stack-$Stage" "Branding-Bucket-Name-$Stage"

Write-Host "Artifacts Bucket:     $ArtifactsBucket"
Write-Host "Branding Bucket:      $BrandingBucket"
Write-Host ""

# Auth Stack Outputs
Write-Host "🔐 AUTHENTICATION (Cognito)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
$UserPoolId = Get-StackOutput "Veraproof-Auth-Stack-$Stage" "User-Pool-ID-$Stage"
$UserPoolClientId = Get-StackOutput "Veraproof-Auth-Stack-$Stage" "User-Pool-Client-ID-$Stage"
$UserPoolDomain = Get-StackOutput "Veraproof-Auth-Stack-$Stage" "User-Pool-Domain-$Stage"

Write-Host "User Pool ID:         $UserPoolId"
Write-Host "User Pool Client ID:  $UserPoolClientId"
Write-Host "User Pool Domain:     $UserPoolDomain"
Write-Host ""

# Quick Test Commands
Write-Host "🧪 QUICK TEST COMMANDS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Test API Health:"
Write-Host "  curl $ApiUrl/health"
Write-Host ""
Write-Host "Open Dashboard:"
Write-Host "  start $DashboardUrl"
Write-Host ""
Write-Host "Deploy Frontend:"
Write-Host "  # Dashboard"
Write-Host "  cd partner-dashboard; npm run build"
Write-Host "  aws s3 sync dist/partner-dashboard s3://$DashboardBucket/ --delete"
Write-Host "  aws cloudfront create-invalidation --distribution-id $DashboardDistId --paths '/*'"
Write-Host ""
Write-Host "  # Verification Interface"
Write-Host "  cd verification-interface"
Write-Host "  aws s3 sync . s3://$VerificationBucket/ --delete"
Write-Host "  aws cloudfront create-invalidation --distribution-id $VerificationDistId --paths '/*'"
Write-Host ""

# Save to file
$OutputFile = "deployment-outputs-$Stage.txt"
@"
VeraProof AI - Deployment Outputs ($Stage)
Generated: $(Get-Date)

API_URL=$ApiUrl
DASHBOARD_URL=$DashboardUrl
VERIFICATION_URL=$VerificationUrl
DATABASE_ENDPOINT=$DbEndpoint
DATABASE_PORT=$DbPort
DASHBOARD_BUCKET=$DashboardBucket
VERIFICATION_BUCKET=$VerificationBucket
DASHBOARD_DIST_ID=$DashboardDistId
VERIFICATION_DIST_ID=$VerificationDistId
ARTIFACTS_BUCKET=$ArtifactsBucket
BRANDING_BUCKET=$BrandingBucket
USER_POOL_ID=$UserPoolId
USER_POOL_CLIENT_ID=$UserPoolClientId
"@ | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "📄 Outputs saved to: $OutputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
