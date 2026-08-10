@echo off
cd /d C:\APEX_APP

rem Kill anything already bound to port 3002 FIRST, before touching the log
rem file below. A still-running old instance holds that log file open via its
rem own output redirection, which would block this script's echo/redirect and
rem abort the whole thing before it ever reaches the kill step. Killing first,
rem silently, sidesteps the lock entirely.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3002" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1

rem Give Windows a moment to release the port/file handle after the kill.
timeout /t 2 /nobreak >nul

echo ---- %date% %time% starting APEX App ---- >> scripts\service-logs\apex-app.log
call npm run start >> scripts\service-logs\apex-app.log 2>&1
