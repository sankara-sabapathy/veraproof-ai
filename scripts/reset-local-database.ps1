# Reset Local Database
# This script drops and recreates the local PostgreSQL database with the updated schema

Write-Host "Resetting Local Database..." -ForegroundColor Yellow
Write-Host ""

# Stop backend if running
Write-Host "Stopping backend..." -ForegroundColor Cyan
try {
    Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
} catch {
    # Ignore errors
}

# Connect to PostgreSQL and recreate database
Write-Host "Recreating database..." -ForegroundColor Cyan

$env:PGPASSWORD = "veraproof_dev_password"

# Drop and recreate database
psql -h localhost -U veraproof -d postgres -c "DROP DATABASE IF EXISTS veraproof;"
psql -h localhost -U veraproof -d postgres -c "CREATE DATABASE veraproof;"

# Run init script
psql -h localhost -U veraproof -d veraproof -f backend/db/init.sql

Write-Host ""
Write-Host "✅ Database reset complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start the backend:" -ForegroundColor Cyan
Write-Host "  python scripts/start_backend_https.py" -ForegroundColor Yellow
