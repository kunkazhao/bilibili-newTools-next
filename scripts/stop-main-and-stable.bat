@echo off
setlocal

set "STABLE_BACKEND_PORT=18000"
set "STABLE_FRONTEND_PORT=15173"

call "%~dp0stop-main.bat"

echo Stopping stable windows by title...
taskkill /FI "WINDOWTITLE eq stable-backend-%STABLE_BACKEND_PORT%" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq stable-frontend-%STABLE_FRONTEND_PORT%" /T /F >nul 2>&1

echo Stopping stable processes by port...
call :kill_port %STABLE_BACKEND_PORT%
call :kill_port %STABLE_FRONTEND_PORT%

echo Main + Stable versions stopped.
exit /b 0

:kill_port
powershell -NoProfile -Command "$port=%1; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match ('--port\s+' + $port + '(\D|$)') -and ($_.CommandLine -match 'uvicorn|vite') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %1 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)"') do (
  taskkill /PID %%P /T /F >nul 2>&1
)
exit /b 0
