# Deploying APEX to a new host PC (target: <NEW_PC_IP>)

This is a runbook to run **on the new PC itself** (this session can't reach it directly).
Run everything in an **elevated PowerShell** unless noted otherwise. Steps assume Windows.

Once this PC is confirmed working, this machine (the current dev PC) becomes dev-only —
see the last section for how to decommission hosting here.

---

## 1. Set the static IP to <NEW_PC_IP>

Check the adapter name first:

```powershell
Get-NetAdapter | Select-Object Name, InterfaceDescription, Status
```

Then set a static IP on it (replace `"Ethernet"` with the real adapter name, and
`192.168.1.1` with your router's actual gateway IP if different):

```powershell
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress <NEW_PC_IP> -PrefixLength 24 -DefaultGateway 192.168.1.1
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("192.168.1.1","1.1.1.1")
```

**Better long-term option:** instead of a static IP set on the PC, reserve <NEW_PC_IP>
for this PC's MAC address in your router's DHCP settings. Same result, but survives
network adapter resets and is easier to change later. Either works — pick whichever
you're comfortable managing.

---

## 2. Install prerequisites

- **Node.js** — install the LTS build from nodejs.org. This dev PC runs v24.15.0;
  anything 20.9+ works, but matching versions avoids surprises.
- **PostgreSQL** — install version 18 from postgresql.org (matches this dev PC).
  During install, set a superuser (`postgres`) password and remember it.
- **Git** — install from git-scm.com.

Verify after installing:

```powershell
node --version
git --version
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

---

## 3. Clone the repository

```powershell
New-Item -ItemType Directory -Force -Path C:\APEX_APP
git clone https://github.com/toknek02/apex-app.git C:\APEX_APP
cd C:\APEX_APP
npm install
```

---

## 4. Create the database and user

```powershell
$env:PGPASSWORD = "<the postgres superuser password you set during install>"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE USER apex_user WITH PASSWORD '<choose-a-strong-password>';"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE apex_db OWNER apex_user;"
Remove-Item Env:\PGPASSWORD
```

Pick your own password for `apex_user` — don't reuse the dev placeholder from this
machine's `.env`.

---

## 5. Configure `.env`

Create `C:\APEX_APP\.env`:

```
DATABASE_URL="postgresql://apex_user:<the-password-you-just-set>@localhost:5432/apex_db"
AUTH_SECRET="<generate-a-real-secret-see-below>"
```

Generate a real `AUTH_SECRET` (32+ random bytes) — **don't reuse this dev PC's
secret**, since anyone with it could forge session tokens:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Leave `AUTH_URL` unset, same reasoning as this dev PC's `.env` — `trustHost: true`
derives the origin per-request, so login works whether it's reached via
`<NEW_PC_IP>`, `localhost`, or later a real domain.

---

## 6. Bring in the database

You have two options — pick based on whether the data on this dev PC (staff records,
timesheet entries, LogBook events, etc.) is real data you want to keep, or just test
data you're fine leaving behind.

### Option A — carry over existing data (recommended if you've been testing real records)

On **this dev PC**, take a fresh backup:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\APEX_APP\scripts\backup-db.ps1"
```

This drops a `.dump` file in `C:\APEX_APP\backups\`. Copy the newest one to the new
PC (USB drive, network share, whatever's easiest), then on the **new PC**:

```powershell
npx prisma migrate deploy
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h localhost -U apex_user -d apex_db --clean --if-exists "C:\path\to\apex_db_<timestamp>.dump"
```

(It'll prompt for the `apex_user` password you set in step 4.)

### Option B — start fresh

On the **new PC**:

```powershell
npx prisma migrate deploy
npm run seed
```

This creates the schema and a default admin login (`admin@apex.local` / `admin123` —
change this password immediately after first login).

---

## 7. Build and do a manual test run

```powershell
npm run build
npm run start
```

Visit `http://localhost:3002` on the new PC and confirm login works. Stop it with
Ctrl+C once confirmed — the next step makes it persistent.

---

## 8. Allow inbound traffic on port 3002

```powershell
New-NetFirewallRule -DisplayName "APEX App" -Direction Inbound -Protocol TCP -LocalPort 3002 -Action Allow
```

---

## 9. Set up persistence (same pattern as the dev PC)

Create `C:\APEX_APP\scripts\service-logs` and the start script (already in the repo
at `scripts\start-service.cmd` — nothing to create, it came with `git clone`).

Register the scheduled tasks:

```powershell
$action = New-ScheduledTaskAction -Execute 'C:\APEX_APP\scripts\start-service.cmd' -WorkingDirectory 'C:\APEX_APP'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
Register-ScheduledTask -TaskName "APEX App" -Action $action -Trigger $trigger -Settings $settings -Description "Runs the APEX internal app (npm run start) on port 3002 at logon." -Force

$backupAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\APEX_APP\scripts\backup-db.ps1"' -WorkingDirectory 'C:\APEX_APP'
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '2:00AM'
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "APEX DB Backup" -Action $backupAction -Trigger $backupTrigger -Settings $backupSettings -Description "Daily pg_dump of the APEX database, retained 14 days, to C:\APEX_APP\backups." -Force

$eodAction = New-ScheduledTaskAction -Execute 'C:\APEX_APP\scripts\eod-signout.cmd' -WorkingDirectory 'C:\APEX_APP'
$eodTrigger = New-ScheduledTaskTrigger -Daily -At '6:30PM'
$eodSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "APEX EOD Signout" -Action $eodAction -Trigger $eodTrigger -Settings $eodSettings -Description "Closes any still-open attendance records and force-ends all active sessions daily at 6:30pm." -Force
```

Note this one affects real users the moment it fires — don't trigger it manually to test unless you're fine being logged out immediately.

If you want this to survive an unattended reboot with nobody logged in, that needs
boot-level registration from an elevated prompt (same caveat as the dev PC):

```powershell
$action = New-ScheduledTaskAction -Execute 'C:\APEX_APP\scripts\start-service.cmd' -WorkingDirectory 'C:\APEX_APP'
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)
Register-ScheduledTask -TaskName "APEX App" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Runs the APEX internal app (npm run start) on port 3002 at system startup." -Force
```

Also confirm PostgreSQL's own service is set to auto-start (it defaults to this):

```powershell
Get-Service -Name "postgresql-x64-18" | Select-Object Status, StartType
```

---

## 10. Verify from another device

Start the task and confirm it's reachable:

```powershell
Start-ScheduledTask -TaskName "APEX App"
Start-Sleep -Seconds 5
Invoke-WebRequest -Uri "http://localhost:3002/login" -UseBasicParsing | Select-Object StatusCode
```

Then from a phone or another PC on the same network, open `http://<NEW_PC_IP>:3002`
and confirm the login page loads and you can sign in.

---

## 11. Future redeploys (after code changes get pushed to GitHub)

On the new PC, whenever there's a new commit to pull in:

```powershell
Stop-ScheduledTask -TaskName "APEX App"
cd C:\APEX_APP
git pull origin master
npm install
npx prisma migrate deploy
npm run build
Start-ScheduledTask -TaskName "APEX App"
```

(Use `Stop-ScheduledTask`/`Start-ScheduledTask`, not `Stop-Process` — killing the
node process directly from outside the task's own security context fails with
"Access is denied.")

---

## 12. Once the new PC is confirmed working: decommission this dev PC's hosting

On **this dev PC**:

```powershell
Stop-ScheduledTask -TaskName "APEX App"
Unregister-ScheduledTask -TaskName "APEX App" -Confirm:$false
Unregister-ScheduledTask -TaskName "APEX DB Backup" -Confirm:$false
Unregister-ScheduledTask -TaskName "APEX EOD Signout" -Confirm:$false
```

Leave PostgreSQL installed here if you still want a local DB for development/testing,
or uninstall it if this PC won't need one going forward — your call.
