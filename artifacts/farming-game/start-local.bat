@echo off
setlocal

echo ==========================================
echo   Pixel Farm Life - Start Local Server
echo ==========================================
echo.

cd /d "%~dp0"
if errorlevel 1 (
  echo Failed to open project directory.
  pause
  exit /b 1
)

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  echo Please install Node.js, then run this file again.
  pause
  exit /b 1
)

echo [2/3] Checking pnpm...
pnpm --version >nul 2>&1
if errorlevel 1 (
  echo pnpm is not installed or not available in PATH.
  echo Install it with:
  echo   npm install -g pnpm
  pause
  exit /b 1
)

echo [3/3] Building project...
call pnpm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Starting local server on http://localhost:3000
echo Keep this window open while using the game.
echo.

start "" http://localhost:3000
call pnpm run serve:local

if errorlevel 1 (
  echo.
  echo Local server stopped or failed to start.
  pause
  exit /b 1
)

endlocal
