@echo off
cd /d C:\APEX_APP

rem Kill anything already bound to port 80, or the old port 3002 (leftover
rem from before the port-80 migration -- safe to keep checking indefinitely,
rem this is a no-op once nothing's ever on 3002 again), BEFORE touching the
rem log file below. A still-running old instance holds that log file open
rem via its own output redirection, which would block this script's
rem echo/redirect and abort the whole thing before it ever reaches the kill
rem step. Killing first, silently, sidesteps the lock entirely.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":80 " ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3002 " ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1

rem Give Windows a moment to release the port/file handle after the kill.
rem NOT `timeout` -- it tries to read the console for an abort keypress, which
rem doesn't exist under Task Scheduler, so it errors out and kills the whole
rem script before the server ever starts. `ping` as a delay has no such issue.
ping -n 3 127.0.0.1 >nul

echo ---- %date% %time% starting APEX App ---- >> scripts\service-logs\apex-app.log
call "C:\Program Files\nodejs\node.exe" "C:\APEX_APP\node_modules\next\dist\bin\next" start --hostname 0.0.0.0 --port 80 >> scripts\service-logs\apex-app.log 2>&1
