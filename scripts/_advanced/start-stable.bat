@echo off
setlocal
chcp 65001 >nul

set "ROOT_DIR=%~dp0..\..\"
set "SOURCE_DIR=%ROOT_DIR%"
set "STABLE_DIR=%ROOT_DIR%..\bilibili-newTools-next-stable"
set "FALLBACK_DIR=%ROOT_DIR%"
set "FRONTEND_PORT=15173"
set "BACKEND_PORT=18000"
set "BACKEND_HOST=0.0.0.0"
set "VITE_HOST=0.0.0.0"
set "DRY_RUN=0"

if /I "%~1"=="--dry-run" set "DRY_RUN=1"

if not exist "%STABLE_DIR%" (
  echo [ERROR] Stable worktree not found: %STABLE_DIR%
  echo Run this once: git worktree add ..\bilibili-newTools-next-stable -b stable-lan
  exit /b 1
)

if "%DRY_RUN%"=="0" (
  taskkill /FI "WINDOWTITLE eq stable-backend-%BACKEND_PORT%" /T /F >nul 2>&1
  taskkill /FI "WINDOWTITLE eq stable-frontend-%FRONTEND_PORT%" /T /F >nul 2>&1
  call :kill_port %BACKEND_PORT%
  call :kill_port %FRONTEND_PORT%
)

if not exist "%STABLE_DIR%\.env" if exist "%SOURCE_DIR%\.env" (
  copy /Y "%SOURCE_DIR%\.env" "%STABLE_DIR%\.env" >nul
)
if not exist "%STABLE_DIR%\.env" if exist "%FALLBACK_DIR%\.env" (
  copy /Y "%FALLBACK_DIR%\.env" "%STABLE_DIR%\.env" >nul
)

if not exist "%STABLE_DIR%\backend\.env" if exist "%SOURCE_DIR%\backend\.env" (
  copy /Y "%SOURCE_DIR%\backend\.env" "%STABLE_DIR%\backend\.env" >nul
)
if not exist "%STABLE_DIR%\backend\.env" if exist "%FALLBACK_DIR%\backend\.env" (
  copy /Y "%FALLBACK_DIR%\backend\.env" "%STABLE_DIR%\backend\.env" >nul
)

if "%DRY_RUN%"=="1" (
  echo [DRY RUN] Stable dir: %STABLE_DIR%
  echo [DRY RUN] Backend: python -m uvicorn backend.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --reload
  echo [DRY RUN] Frontend: npm run dev -- --host %VITE_HOST% --port %FRONTEND_PORT%
  echo [DRY RUN] Local URL: http://localhost:%FRONTEND_PORT%/
  exit /b 0
)

if not exist "%STABLE_DIR%\node_modules" (
  echo Installing frontend dependencies in stable worktree...
  pushd "%STABLE_DIR%"
  call npm install
  if errorlevel 1 (
    popd
    echo [ERROR] npm install failed in stable worktree.
    exit /b 1
  )
  popd
)

echo Starting stable backend on port %BACKEND_PORT%...
start "stable-backend-%BACKEND_PORT%" cmd /k "cd /d ""%STABLE_DIR%"" && python -m uvicorn backend.main:app --host %BACKEND_HOST% --port %BACKEND_PORT% --reload"

echo Starting stable frontend on port %FRONTEND_PORT%...
start "stable-frontend-%FRONTEND_PORT%" cmd /k "cd /d ""%STABLE_DIR%"" && npm run dev -- --host %VITE_HOST% --port %FRONTEND_PORT%"

echo.
echo Stable version started.
echo Local URL:  http://localhost:%FRONTEND_PORT%/
echo LAN URL:    http://YOUR_LAN_IP:%FRONTEND_PORT%/
echo Backend:    http://127.0.0.1:%BACKEND_PORT%/
exit /b 0

:kill_port
powershell -NoProfile -Command "$port=%1; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match ('--port\s+' + $port + '(\D|$)') -and ($_.CommandLine -match 'uvicorn|vite') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %1 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)"') do (
  taskkill /PID %%P /T /F >nul 2>&1
)
exit /b 0
