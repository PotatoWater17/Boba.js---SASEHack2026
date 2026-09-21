@echo off
REM PotatoWater operator -- forwards to potatowater.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0potatowater.ps1" %*
exit /b %ERRORLEVEL%
