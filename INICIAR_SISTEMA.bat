@echo off
title MIDAS Intranet - Launcher
color 0A

echo ===================================================
echo    MIDAS DOMINICANA - SISTEMA INTRANET (Jorddy)
echo ===================================================
echo.
echo [1/2] Prendiendo el Servidor Backend (Base de Datos)...
start "MIDAS Backend" /min cmd /k "cd project\backend && npm start"

timeout /t 3 >nul

echo [2/2] Prendiendo el Frontend (Pantalla)...
start "MIDAS Frontend" /min cmd /k "cd project && npm run dev"

timeout /t 3 >nul

echo.
echo ¡Todo Niti3! Abriendo el navegador...
start http://localhost:5173

echo.
echo No cierres las ventanas negras, minimizalas.
echo Si las cierras, se cae el sistema.
echo.
pause
