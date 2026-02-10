# API Testing Script - Simple Version
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  API HEALTH CHECK" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "   Status: OK" -ForegroundColor Green
    Write-Host "   Response: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "   Status: FAILED" -ForegroundColor Red
}
Write-Host ""

# Test 2: Frontend
Write-Host "2. Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 5
    Write-Host "   Status: OK (Code: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   Status: FAILED" -ForegroundColor Red
}
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
