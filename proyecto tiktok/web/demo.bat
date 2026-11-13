@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node server.mjs --demo
  goto :eof
)
set "NODE=C:\Users\adria\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if exist "%NODE%" (
  "%NODE%" server.mjs --demo
  goto :eof
)
echo No encuentro Node.js. Instala la version LTS desde https://nodejs.org
pause
