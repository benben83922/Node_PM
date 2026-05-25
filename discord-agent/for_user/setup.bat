@echo off
for /f "delims=" %%i in ('wsl wslpath -a "%~dp0"') do set WSL_DIR=%%i
wsl bash "%WSL_DIR%setup.sh"
pause
