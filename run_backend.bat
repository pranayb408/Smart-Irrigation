@echo off
cd /d "%~dp0"
echo Starting AI Smart Irrigation Backend on http://127.0.0.1:8000 ...
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying with py launcher...
    py -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
)
pause
