# Add Users Table Migration
# This script adds the users table to the existing database without losing data

Write-Host "Adding users table to database..." -ForegroundColor Yellow
Write-Host ""

$env:PGPASSWORD = "veraproof_dev_password"

# Run migration
psql -h localhost -U veraproof -d veraproof -f backend/db/add_users_table.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Users table added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Restart the backend to use the new authentication:" -ForegroundColor Cyan
    Write-Host "  python scripts/start_backend_https.py" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "Check the error message above." -ForegroundColor Red
}
