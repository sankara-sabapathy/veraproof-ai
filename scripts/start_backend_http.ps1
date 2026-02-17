# VeraProof AI - Start Backend with HTTP (for local dashboard development)
# Use this when testing the dashboard on localhost:4200

Write-Host "Starting Backend API with HTTP..." -ForegroundColor Green
Write-Host "This is for local dashboard development only." -ForegroundColor Yellow
Write-Host "For mobile testing, use start_backend_https.py instead." -ForegroundColor Yellow
Write-Host ""

Set-Location backend

try {
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} catch {
    Write-Host "Error starting backend: $_" -ForegroundColor Red
} finally {
    Set-Location ..
}
