@echo off
setlocal
cd /d "%~dp0"
set "ESQUIU_NODE=node"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "ESQUIU_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%ESQUIU_NODE%" -e "const v=process.versions.node.split('.').map(Number);if(v[0]<24||(v[0]===24&&v[1]<4)){console.error('Se necesita Node 24.4 o posterior.');process.exit(1)}"
if errorlevel 1 goto error
echo Tienda: http://127.0.0.1:4190/
echo Panel: http://127.0.0.1:4190/admin/
echo La clave estara en .local-data\local-admin-key.txt.
echo Mantene esta ventana abierta mientras usas el panel.
"%ESQUIU_NODE%" server\local.mjs
goto end
:error
echo No se pudo iniciar. Instala Node 24.4 o posterior desde nodejs.org.
:end
pause
