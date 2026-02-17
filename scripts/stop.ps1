# VeraProof AI - Stop All Services (Windows PowerShell)

Write-Host "Stopping VeraProof AI Services..." -ForegroundColor Red

# Stop Docker services
Write-Host "`nStopping Docker services..." -ForegroundColor Cyan
docker-compose down

Write-Host "`n✅ All services stopped!" -ForegroundColor Green
