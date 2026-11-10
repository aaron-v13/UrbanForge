@echo off
title UrbanForge Express Server
cd /d "%~dp0"
echo ===================================================
echo  Starting UrbanForge Express Server on Port 3000...
echo ===================================================

set "PATH=D:\aalto faltu\EE;%PATH%"

node server.js
if %errorlevel% neq 0 (
    echo.
    echo Server stopped with error.
)
pause
