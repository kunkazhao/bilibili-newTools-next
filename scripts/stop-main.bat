@echo off
setlocal

set "MAIN_BACKEND_PORT=8000"
set "MAIN_FRONTEND_PORT=5173"

echo Stopping main windows by title...
taskkill /FI "WINDOWTITLE eq main-backend-%MAIN_BACKEND_PORT%" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq main-frontend-%MAIN_FRONTEND_PORT%" /T /F >nul 2>&1

echo Stopping main processes by port...
call :kill_port %MAIN_BACKEND_PORT%
call :kill_port %MAIN_FRONTEND_PORT%

echo Main version stopped.
exit /b 0

:kill_port
powershell -NoProfile -Command "$port=%1; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match ('--port\s+' + $port + '(\D|$)') -and ($_.CommandLine -match 'uvicorn|vite') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %1 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)"') do (
  taskkill /PID %%P /T /F >nul 2>&1
)
exit /b 0
