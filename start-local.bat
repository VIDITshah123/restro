@echo off
echo ===================================================
echo   Starting Restaurant Management System Locally
echo ===================================================

echo [1/3] Starting Python AI Service on port 5000...
start "Restro AI Service" cmd /k "cd ai-service && python app.py"

echo [2/3] Starting Backend API Server on port 3000...
start "Restro Backend API" cmd /k "cd server && npm start"

echo [3/3] Starting Frontend Vite App on port 5173...
start "Restro Frontend App" cmd /k "cd client && npm run dev"

echo.
echo All services have been launched in separate windows!
echo - Frontend:  http://localhost:5173
echo - Backend:   http://localhost:3000
echo - AI Server: http://localhost:5000
echo ===================================================
