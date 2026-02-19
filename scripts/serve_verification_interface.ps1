# Serve Verification Interface
# Simple HTTP server for local testing

Write-Host "Starting Verification Interface Server..." -ForegroundColor Green
Write-Host ""
Write-Host "The verification interface will be available at:" -ForegroundColor Cyan
Write-Host "  http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "To test with a session:" -ForegroundColor Cyan
Write-Host "  1. Create a session from the dashboard" -ForegroundColor White
Write-Host "  2. Copy the session ID from the URL" -ForegroundColor White
Write-Host "  3. Open: http://localhost:8080?session_id=<SESSION_ID>" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Change to verification-interface directory and start Python HTTP server
Set-Location verification-interface
python -m http.server 8080
