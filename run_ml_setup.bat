@echo off
echo ==========================================
echo   Smart Traffic System - ML Setup Runner
echo ==========================================

if not exist backend\venv (
    echo Error: Virtual environment 'backend\venv' not found.
    echo Please make sure you have run the backend setup first.
    pause
    exit /b
)

echo Activating Python Virtual Environment...
call backend\venv\Scripts\activate

echo Checking dependencies...
pip install pandas torch torchvision ultralytics -q

echo.
echo [1/2] Generating Synthetic Traffic Data...
python ml_training\prediction\generate_traffic_data.py
if %ERRORLEVEL% NEQ 0 (
    echo Failed to generate data.
    pause
    exit /b
)

echo.
echo [2/2] Training Prediction Model (LSTM)...
python ml_training\prediction\lstm_model.py
if %ERRORLEVEL% NEQ 0 (
    echo Failed to train model.
    pause
    exit /b
)

echo.
echo ==========================================
echo   ML Pipeline Setup/Run Complete!
echo ==========================================
pause
