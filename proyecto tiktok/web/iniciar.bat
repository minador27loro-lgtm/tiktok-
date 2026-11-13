@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  node server.mjs
  goto :eof
)
set "NODE=C:\Users\adria\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if exist "%NODE%" (
  "%NODE%" server.mjs
  goto :eof
)
echo.
echo No encuentro Node.js en este ordenador.
echo Instala la version LTS desde https://nodejs.org y vuelve a ejecutar iniciar.bat
echo.
pause
