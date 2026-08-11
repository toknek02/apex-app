@echo off
cd /d C:\APEX_APP

echo ---- %date% %time% running EOD auto sign-out ---- >> scripts\service-logs\eod-signout.log
call npm run eod-signout >> scripts\service-logs\eod-signout.log 2>&1
