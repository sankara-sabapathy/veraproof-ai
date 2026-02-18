# VeraProof AI - SSM Parameter Store Setup (PowerShell)
# Creates all required SSM parameters for deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$Stage = "prod",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     VeraProof AI - SSM Parameters Setup               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Stage: $Stage" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ AWS CLI configured" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: AWS CLI not configured" -ForegroundColor Red
    Write-Host "Run: aws configure"
    exit 1
}

Write-Host ""

# Function to generate random string
function Get-RandomString {
    param([int]$Length)
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes) -replace '[+/=]','' | Select-Object -First $Length
}

# 1. Database Password
Write-Host "📝 Creating database password..." -ForegroundColor Yellow
$dbPassword = Get-RandomString -Length 32
try {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/database/password" `
        --value $dbPassword `
        --type "SecureString" `
        --description "Database password for $Stage" `
        --region $Region `
        --overwrite 2>$null
} catch {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/database/password" `
        --value $dbPassword `
        --type "SecureString" `
        --description "Database password for $Stage" `
        --region $Region
}
Write-Host "   ✓ /veraproof/$Stage/database/password" -ForegroundColor Green

# 2. JWT Secret Key
Write-Host "📝 Creating JWT secret key..." -ForegroundColor Yellow
$jwtSecret = Get-RandomString -Length 64
try {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/jwt/secret-key" `
        --value $jwtSecret `
        --type "SecureString" `
        --description "JWT secret key for $Stage" `
        --region $Region `
        --overwrite 2>$null
} catch {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/jwt/secret-key" `
        --value $jwtSecret `
        --type "SecureString" `
        --description "JWT secret key for $Stage" `
        --region $Region
}
Write-Host "   ✓ /veraproof/$Stage/jwt/secret-key" -ForegroundColor Green

# 3. API Keys Salt
Write-Host "📝 Creating API keys salt..." -ForegroundColor Yellow
$apiSalt = Get-RandomString -Length 32
try {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/api-keys/salt" `
        --value $apiSalt `
        --type "SecureString" `
        --description "API keys salt for $Stage" `
        --region $Region `
        --overwrite 2>$null
} catch {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/api-keys/salt" `
        --value $apiSalt `
        --type "SecureString" `
        --description "API keys salt for $Stage" `
        --region $Region
}
Write-Host "   ✓ /veraproof/$Stage/api-keys/salt" -ForegroundColor Green

# 4. Webhook Secret
Write-Host "📝 Creating webhook secret..." -ForegroundColor Yellow
$webhookSecret = Get-RandomString -Length 32
try {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/webhook/secret" `
        --value $webhookSecret `
        --type "SecureString" `
        --description "Webhook HMAC secret for $Stage" `
        --region $Region `
        --overwrite 2>$null
} catch {
    aws ssm put-parameter `
        --name "/veraproof/$Stage/webhook/secret" `
        --value $webhookSecret `
        --type "SecureString" `
        --description "Webhook HMAC secret for $Stage" `
        --region $Region
}
Write-Host "   ✓ /veraproof/$Stage/webhook/secret" -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ Setup Complete!                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Parameters created:" -ForegroundColor Cyan
Write-Host "  1. /veraproof/$Stage/database/password"
Write-Host "  2. /veraproof/$Stage/jwt/secret-key"
Write-Host "  3. /veraproof/$Stage/api-keys/salt"
Write-Host "  4. /veraproof/$Stage/webhook/secret"
Write-Host ""
Write-Host "💰 Cost: `$0.00 (SSM Parameter Store Standard tier is FREE)" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Deploy infrastructure: cd infrastructure; .\deploy.ps1 -Stage $Stage -Account YOUR_ACCOUNT_ID"
Write-Host "  2. Update backend to read from SSM"
Write-Host "  3. Test deployment"
Write-Host ""
Write-Host "🔍 To view parameters:" -ForegroundColor Cyan
Write-Host "  aws ssm get-parameter --name /veraproof/$Stage/database/password --with-decryption --region $Region"
