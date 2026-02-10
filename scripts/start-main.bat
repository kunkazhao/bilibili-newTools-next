@echo off
setlocal
chcp 65001 >nul

set "ROOT_DIR=%~dp0..\"
set "FRONTEND_PORT=5173"
set "BACKEND_PORT=8000"
set "BACKEND_HOST=0.0.0.0"
set "VITE_HOST=0.0.0.0"

call "%~dp0stop-main.bat" >nul 2>&1

echo Starting main backend on port %BACKEND_PORT%...
start "main-backend-%BACKEND_PORT%" cmd /k "cd /d ""%ROOT_DIR%"" && python -m uvicorn backend.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --reload"

echo Starting main frontend on port %FRONTEND_PORT%...
start "main-frontend-%FRONTEND_PORT%" cmd /k "cd /d ""%ROOT_DIR%"" && npm run dev -- --host %VITE_HOST% --port %FRONTEND_PORT%"

echo.
echo Main version started.
echo Local URL:  http://localhost:%FRONTEND_PORT%/
echo LAN URL:    http://YOUR_LAN_IP:%FRONTEND_PORT%/
echo Backend:    http://127.0.0.1:%BACKEND_PORT%/
exit /b 0
