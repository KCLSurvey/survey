@echo off
cd /d %~dp0
if not exist .env (
  echo File .env not found. Copy env.example to .env and fill your API key.
  pause
  exit /b 1
)
node calculator_ai_proxy_v2.js
pause
