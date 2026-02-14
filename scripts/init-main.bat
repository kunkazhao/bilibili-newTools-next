@echo off
setlocal
chcp 65001 >nul

set "ROOT_DIR=%~dp0..\"
set "VERIFY=0"
set "WITH_PLAYWRIGHT=0"
set "DRY_RUN=0"

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--verify" set "VERIFY=1"
if /I "%~1"=="--with-playwright" set "WITH_PLAYWRIGHT=1"
if /I "%~1"=="--dry-run" set "DRY_RUN=1"
shift
goto parse_args
:args_done

echo ========================================
echo Initializing project dependencies
echo Project: %ROOT_DIR%
echo ========================================

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 20+ first.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Reinstall Node.js.
  exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python not found. Install Python 3.10+ first.
  exit /b 1
)

echo [1/5] Checking Python version...
python -c "import sys; exit(0 if sys.version_info >= (3,10) else 1)"
if errorlevel 1 (
  echo [ERROR] Python 3.10+ required.
  python --version
  exit /b 1
)

if "%DRY_RUN%"=="1" (
  echo [DRY RUN] Would run: npm install --no-audit --no-fund
) else (
  echo [2/5] Installing frontend dependencies...
  pushd "%ROOT_DIR%"
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    popd
    echo [ERROR] npm install failed.
    exit /b 1
  )
  popd
)

if "%DRY_RUN%"=="1" (
  echo [DRY RUN] Would run: python -m pip install --upgrade pip
  echo [DRY RUN] Would run: python -m pip install -r requirements.txt
) else (
  echo [3/5] Installing backend dependencies...
  pushd "%ROOT_DIR%"
  python -m pip install --upgrade pip
  if errorlevel 1 (
    popd
    echo [ERROR] pip upgrade failed.
    exit /b 1
  )
  python -m pip install -r requirements.txt
  if errorlevel 1 (
    popd
    echo [ERROR] backend dependency install failed.
    exit /b 1
  )
  popd
)

if "%WITH_PLAYWRIGHT%"=="1" (
  if "%DRY_RUN%"=="1" (
    echo [DRY RUN] Would run: python -m playwright install chromium
  ) else (
    echo [Optional] Installing Playwright Chromium browser...
    python -m playwright install chromium
    if errorlevel 1 (
      echo [WARN] Playwright browser install failed. You can retry manually later.
    )
  )
)

echo [4/5] Preparing env files...
if not exist "%ROOT_DIR%\.env" (
  if exist "%ROOT_DIR%\.env.example" (
    copy /Y "%ROOT_DIR%\.env.example" "%ROOT_DIR%\.env" >nul
    echo - Created .env from .env.example
  )
)
if not exist "%ROOT_DIR%\backend\.env" (
  if exist "%ROOT_DIR%\backend\.env.example" (
    copy /Y "%ROOT_DIR%\backend\.env.example" "%ROOT_DIR%\backend\.env" >nul
    echo - Created backend/.env from backend/.env.example
  )
)

if "%VERIFY%"=="1" (
  if "%DRY_RUN%"=="1" (
    echo [DRY RUN] Would run: npm run build
  ) else (
    echo [5/5] Running build verification...
    pushd "%ROOT_DIR%"
    call npm run build
    if errorlevel 1 (
      popd
      echo [ERROR] Build verification failed.
      exit /b 1
    )
    popd
  )
) else (
  echo [5/5] Skipping build verification. Use --verify to enable.
)

echo.
echo Initialization complete.
echo Next step: run scripts\start-main.bat
echo Open: http://localhost:5173/
exit /b 0
