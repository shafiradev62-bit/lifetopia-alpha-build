@echo off
setlocal

echo ==========================================
echo   Pixel Farm Life - Start Farming Localhost
echo ==========================================
echo.

cd /d "%~dp0artifacts\farming-game"
if errorlevel 1 (
  echo Failed to open farming-game directory.
  echo Expected path: artifacts\farming-game
  pause
  exit /b 1
)

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  echo Please install Node.js, then run this file again.
  pause
  exit /b 1
)

echo [2/4] Checking pnpm...
pnpm --version >nul 2>&1
if errorlevel 1 (
  echo pnpm is not installed or not available in PATH.
  echo Install it with:
  echo   npm install -g pnpm
  pause
  exit /b 1
)

echo [3/4] Installing dependencies if needed...
call pnpm install
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)

echo [4/4] Starting Vite dev server...
echo.
echo If the browser does not open automatically, visit:
echo   http://localhost:3000
echo.
echo Keep this window open while using the game.
echo.

start "" http://localhost:3000
call pnpm run dev

echo.
echo Server stopped.
pause
endlocal
