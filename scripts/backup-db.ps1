# Bundles a Postgres dump and the uploaded-files storage folder into a single
# apex_backup_<timestamp>.zip in backups/, and prunes zips older than
# $RetentionDays. Reads connection details from .env at runtime so no
# credentials live in this script or in Task Scheduler. Restoring from one of
# these zips is scripts\restore-backup.ps1.

$ErrorActionPreference = 'Stop'
$RetentionDays = 14
$ProjectRoot = 'C:\APEX_APP'
$PgBin = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
$BackupDir = Join-Path $ProjectRoot 'backups'
$StorageDir = Join-Path $ProjectRoot 'storage'
$LogFile = Join-Path $ProjectRoot 'scripts\service-logs\backup.log'

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null

function Log($msg) {
  "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) $msg" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

try {
  $envLine = Get-Content (Join-Path $ProjectRoot '.env') | Where-Object { $_ -match '^DATABASE_URL=' }
  if (-not $envLine) { throw 'DATABASE_URL not found in .env' }

  # postgresql://user:password@host:port/dbname
  if ($envLine -notmatch 'postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^"\s]+)') {
    throw 'Could not parse DATABASE_URL'
  }
  $dbUser = $matches[1]
  $dbPassword = $matches[2]
  $dbHost = $matches[3]
  $dbPort = $matches[4]
  $dbName = $matches[5]

  $timestamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
  $dumpFile = Join-Path $BackupDir "apex_db_$timestamp.dump"
  $zipFile = Join-Path $BackupDir "apex_backup_$timestamp.zip"

  $env:PGPASSWORD = $dbPassword
  & $PgBin -h $dbHost -p $dbPort -U $dbUser -Fc -f $dumpFile $dbName
  Remove-Item Env:\PGPASSWORD

  if ($LASTEXITCODE -ne 0) { throw "pg_dump exited with code $LASTEXITCODE" }

  # storage/ may not exist yet on a brand-new install with no uploads.
  $pathsToZip = @($dumpFile)
  if (Test-Path $StorageDir) { $pathsToZip += $StorageDir }
  Compress-Archive -Path $pathsToZip -DestinationPath $zipFile -Force
  Remove-Item $dumpFile -Force

  Log "OK: backed up to $zipFile ($((Get-Item $zipFile).Length) bytes)"

  $cutoff = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem $BackupDir -Filter 'apex_backup_*.zip' | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Log "Pruned old backup: $($_.Name)"
  }

  Push-Location $ProjectRoot
  $pruneOutput = npm run prune-audit-log 2>&1 | Out-String
  Pop-Location
  Log "Audit log prune: $($pruneOutput.Trim())"

  Push-Location $ProjectRoot
  $errorPruneOutput = npm run prune-error-log 2>&1 | Out-String
  Pop-Location
  Log "Error log prune: $($errorPruneOutput.Trim())"
} catch {
  Log "ERROR: $_"
  if (Test-Path Env:\PGPASSWORD) { Remove-Item Env:\PGPASSWORD }
  exit 1
}
