# Restores the database and uploaded-files storage folder from a backup zip
# produced by scripts\backup-db.ps1 (apex_backup_<timestamp>.zip).
#
# DESTRUCTIVE: this replaces the current database contents and storage/
# folder entirely. Stop the app first:
#   Stop-ScheduledTask -TaskName "APEX App"
# and start it again once this finishes:
#   Start-ScheduledTask -TaskName "APEX App"
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\restore-backup.ps1 -BackupFile "C:\path\to\apex_backup_20260813_092109.zip"

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = 'C:\APEX_APP'
$PgRestoreBin = 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe'
$StorageDir = Join-Path $ProjectRoot 'storage'

if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }

$envLine = Get-Content (Join-Path $ProjectRoot '.env') | Where-Object { $_ -match '^DATABASE_URL=' }
if (-not $envLine) { throw 'DATABASE_URL not found in .env' }
if ($envLine -notmatch 'postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^"\s]+)') {
  throw 'Could not parse DATABASE_URL'
}
$dbUser = $matches[1]
$dbPassword = $matches[2]
$dbHost = $matches[3]
$dbPort = $matches[4]
$dbName = $matches[5]

$extractDir = Join-Path ([System.IO.Path]::GetTempPath()) "apex_restore_$([System.IO.Path]::GetFileNameWithoutExtension($BackupFile))"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
Expand-Archive -Path $BackupFile -DestinationPath $extractDir -Force

$dumpFile = Get-ChildItem $extractDir -Filter '*.dump' | Select-Object -First 1
if (-not $dumpFile) { throw "No .dump file found inside $BackupFile" }

Write-Host "About to restore into database '$dbName' from $BackupFile"
Write-Host "This REPLACES all current data and uploaded files. Make sure the app is stopped."
$confirm = Read-Host "Type YES to continue"
if ($confirm -ne 'YES') { Write-Host 'Aborted.'; exit 1 }

$env:PGPASSWORD = $dbPassword
& $PgRestoreBin -h $dbHost -p $dbPort -U $dbUser -d $dbName --clean --if-exists $dumpFile.FullName
$restoreExitCode = $LASTEXITCODE
Remove-Item Env:\PGPASSWORD

if ($restoreExitCode -ne 0) { throw "pg_restore exited with code $restoreExitCode" }
Write-Host "Database restored."

$extractedStorage = Join-Path $extractDir 'storage'
if (Test-Path $extractedStorage) {
  if (Test-Path $StorageDir) { Remove-Item $StorageDir -Recurse -Force }
  Move-Item $extractedStorage $StorageDir
  Write-Host "Storage folder restored to $StorageDir."
} else {
  Write-Host "No storage/ folder found in this backup (nothing was uploaded at backup time) — leaving current storage/ untouched."
}

Remove-Item $extractDir -Recurse -Force
Write-Host "Restore complete. Start the app again with: Start-ScheduledTask -TaskName `"APEX App`""
