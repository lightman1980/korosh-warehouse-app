@echo off
setlocal enabledelayedexpansion

REM Kill any process listening on port 5173 (ignore errors)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
)

REM Go to script directory (project root)
pushd %~dp0

REM Install deps if node_modules missing (fast no-op if already installed)
if not exist node_modules (
  echo Installing dependencies (first run)...
  where npm >nul 2>&1
  if errorlevel 1 (
    echo npm not found in PATH. Trying npx to bootstrap vite...
  ) else (
    call npm install --silent
  )
)

REM Start Vite dev server on fixed port 5173 in a new window (robust start)
set "_CMD_TO_RUN="
if exist "node_modules\.bin\vite.cmd" (
  set "_CMD_TO_RUN=\"node_modules\.bin\vite.cmd\" --host --port 5173"
) else (
  where npm >nul 2>&1 && set "_CMD_TO_RUN=npm run dev"
)
if "%_CMD_TO_RUN%"=="" set "_CMD_TO_RUN=npx --yes vite --host --port 5173"
start "Makhazen-Kfi Dev Server" cmd /c "%_CMD_TO_RUN%"

REM Wait until server is ready (poll localhost:5173), then open browser with cache-busting query
set TS=
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds"`) do set TS=%%T
if "%TS%"=="" set TS=%RANDOM%%RANDOM%

set /a _retries=0
:wait_server
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; iwr http://localhost:5173/ -UseBasicParsing | Out-Null" >nul 2>&1
if errorlevel 1 (
  set /a _retries+=1
  if %_retries% GEQ 40 goto open_browser
  timeout /t 1 >nul
  goto wait_server
)

:open_browser
start "" http://localhost:5173/?nocache=1^&ts=%TS%

:end
popd
endlocal
exit /b 0


