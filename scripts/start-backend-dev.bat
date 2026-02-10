@echo off
setlocal
chcp 65001 >nul
echo ========================================
echo Backend dev server (auto reload)
echo Port: 8000
echo ========================================
echo Press Ctrl+C to stop
echo.

set "ROOT_DIR=%~dp0..\"
cd /d "%ROOT_DIR%"
set BACKEND_HOST=0.0.0.0
set BACKEND_PORT=8000

python -m uvicorn backend.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --reload
