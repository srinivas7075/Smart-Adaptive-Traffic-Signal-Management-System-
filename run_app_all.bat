@echo off
echo ===========================================
echo   Smart Traffic System Launcher
echo ===========================================

echo Starting Backend Server...
start "SmartTraffic Backend" cmd /k "cd backend && venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8080"

echo Starting Frontend Dashboard...
start "SmartTraffic Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===========================================
echo   System Started! 
echo   - Backend running on http://127.0.0.1:8080
echo   - Frontend running on http://localhost:5173
echo ===========================================
pause
