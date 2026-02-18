#!/usr/bin/env pwsh
# Get Lightsail Database Information
param(
    [string]$Stage = "prod"
)

$Region = "ap-south-1"
$DbName = "veraproof-db-$Stage"
$ContainerName = "veraproof-api-$Stage"

Write-Host "`n=== Lightsail Database Information ===" -ForegroundColor Cyan

# Get database details
Write-Host "`nRetrieving database details..." -ForegroundColor Yellow
$DbInfo = aws lightsail get-relational-database `
    --relational-database-name $DbName `
    --region $Region `
    --output json | ConvertFrom-Json

if ($DbInfo) {
    Write-Host "`nDatabase Name: $($DbInfo.relationalDatabase.name)" -ForegroundColor Green
    Write-Host "Database State: $($DbInfo.relationalDatabase.state)" -ForegroundColor Green
    Write-Host "Database Engine: $($DbInfo.relationalDatabase.engine) $($DbInfo.relationalDatabase.engineVersion)" -ForegroundColor Green
    Write-Host "Master Username: $($DbInfo.relationalDatabase.masterUsername)" -ForegroundColor Green
    Write-Host "Master Database: $($DbInfo.relationalDatabase.masterDatabaseName)" -ForegroundColor Green
    Write-Host "Endpoint: $($DbInfo.relationalDatabase.masterEndpoint.address):$($DbInfo.relationalDatabase.masterEndpoint.port)" -ForegroundColor Green
}

# Get database password
Write-Host "`nRetrieving database password..." -ForegroundColor Yellow
$PasswordInfo = aws lightsail get-relational-database-master-user-password `
    --relational-database-name $DbName `
    --region $Region `
    --output json | ConvertFrom-Json

if ($PasswordInfo) {
    Write-Host "`nMaster Password: $($PasswordInfo.masterUserPassword)" -ForegroundColor Green
    Write-Host "`nIMPORTANT: Store this password securely!" -ForegroundColor Red
    
    # Offer to store in SSM
    $StoreInSSM = Read-Host "`nDo you want to store this password in SSM Parameter Store? (y/n)"
    if ($StoreInSSM -eq "y") {
        aws ssm put-parameter `
            --name "/veraproof/$Stage/database/password" `
            --value $PasswordInfo.masterUserPassword `
            --type "SecureString" `
            --overwrite `
            --region $Region
        Write-Host "Password stored in SSM: /veraproof/$Stage/database/password" -ForegroundColor Green
    }
}

Write-Host "`n=== Lightsail Container Service Information ===" -ForegroundColor Cyan

# Get container service details
Write-Host "`nRetrieving container service details..." -ForegroundColor Yellow
$ContainerInfo = aws lightsail get-container-services `
    --service-name $ContainerName `
    --region $Region `
    --output json | ConvertFrom-Json

if ($ContainerInfo) {
    $Service = $ContainerInfo.containerServices[0]
    Write-Host "`nService Name: $($Service.containerServiceName)" -ForegroundColor Green
    Write-Host "Service State: $($Service.state)" -ForegroundColor Green
    Write-Host "Power: $($Service.power)" -ForegroundColor Green
    Write-Host "Scale: $($Service.scale)" -ForegroundColor Green
    Write-Host "API URL: $($Service.url)" -ForegroundColor Green
    
    if ($Service.currentDeployment) {
        Write-Host "`nCurrent Deployment:" -ForegroundColor Yellow
        Write-Host "  State: $($Service.currentDeployment.state)" -ForegroundColor Green
        Write-Host "  Version: $($Service.currentDeployment.version)" -ForegroundColor Green
    } else {
        Write-Host "`nNo deployment yet. You need to deploy a container." -ForegroundColor Yellow
    }
}

Write-Host "`n=== Connection String ===" -ForegroundColor Cyan
if ($DbInfo -and $PasswordInfo) {
    $ConnString = "postgresql://$($DbInfo.relationalDatabase.masterUsername):$($PasswordInfo.masterUserPassword)@$($DbInfo.relationalDatabase.masterEndpoint.address):$($DbInfo.relationalDatabase.masterEndpoint.port)/$($DbInfo.relationalDatabase.masterDatabaseName)"
    Write-Host "`n$ConnString" -ForegroundColor Green
    Write-Host "`nYou can use this connection string in your backend configuration." -ForegroundColor Yellow
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Deploy your backend container to Lightsail" -ForegroundColor White
Write-Host "2. Update frontend configuration with API URL" -ForegroundColor White
Write-Host "3. Deploy frontend to S3/CloudFront" -ForegroundColor White
Write-Host "4. Test the complete flow" -ForegroundColor White
Write-Host ""
