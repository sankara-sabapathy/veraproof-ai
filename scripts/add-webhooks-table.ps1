#!/usr/bin/env pwsh
# Add webhooks table to database

Write-Host "Adding webhooks table to database..." -ForegroundColor Cyan

try {
    Get-Content backend/db/add_webhooks_table.sql | docker exec -i veraproof-postgres psql -U veraproof -d veraproof
    Write-Host "Webhooks table added successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to add webhooks table: $_" -ForegroundColor Red
    exit 1
}
