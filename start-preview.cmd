@echo off
setlocal
cd /d "%~dp0"

set "NODE_BIN=C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd"
set "PATH=%NODE_BIN%;%PATH%"

if not exist "%PNPM%" (
  echo Cannot find the bundled preview runner.
  echo Open index.html directly, or install Node.js and run npm install then npm run dev.
  pause
  exit /b 1
)

echo Preview starting...
echo Open these URLs after the server is ready:
echo http://127.0.0.1:5173
echo http://127.0.0.1:5173/client.html
echo http://127.0.0.1:5173/atelier-vault-7291.html
echo.
"%PNPM%" run dev -- --host 127.0.0.1 --port 5173
pause
