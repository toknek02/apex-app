@echo off
cd /d C:\APEX_APP
echo ---- %date% %time% starting APEX App ---- >> scripts\service-logs\apex-app.log
call npm run start >> scripts\service-logs\apex-app.log 2>&1
