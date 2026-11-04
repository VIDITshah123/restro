Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting Restaurant Management System Locally" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "[1/3] Starting Python AI Service on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/ai-service'; python app.py"

Write-Host "[2/3] Starting Backend API Server on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/server'; npm start"

Write-Host "[3/3] Starting Frontend Vite App on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/client'; npm run dev"

Write-Host ""
Write-Host "All services have been launched in separate terminals!" -ForegroundColor Green
Write-Host "- Frontend:  http://localhost:5173" -ForegroundColor Green
Write-Host "- Backend:   http://localhost:3000" -ForegroundColor Green
Write-Host "- AI Server: http://localhost:5000" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
