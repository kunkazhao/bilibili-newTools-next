@echo off
setlocal

call "%~dp0start-main.bat"
if errorlevel 1 (
  echo [ERROR] Failed to start main version.
  exit /b 1
)

timeout /t 1 /nobreak >nul

call "%~dp0start-stable.bat"
if errorlevel 1 (
  echo [ERROR] Failed to start stable version.
  exit /b 1
)

echo.
echo Main + Stable versions started.
exit /b 0
