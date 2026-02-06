@echo off
setlocal
chcp 65001 >nul
echo ========================================
echo Backend dev server (auto reload)
echo Port: 8000
echo ========================================
echo Press Ctrl+C to stop
echo.

cd /d "%~dp0"
set BACKEND_HOST=0.0.0.0
set BACKEND_PORT=8000

python -m uvicorn backend.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --reload
