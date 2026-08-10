# Dumps the APEX Postgres database to backups/, and prunes dumps older than
# $RetentionDays. Reads connection details from .env at runtime so no
# credentials live in this script or in Task Scheduler.

$ErrorActionPreference = 'Stop'
$RetentionDays = 14
$ProjectRoot = 'C:\APEX_APP'
$PgBin = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
$BackupDir = Join-Path $ProjectRoot 'backups'
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
  $outFile = Join-Path $BackupDir "apex_db_$timestamp.dump"

  $env:PGPASSWORD = $dbPassword
  & $PgBin -h $dbHost -p $dbPort -U $dbUser -Fc -f $outFile $dbName
  Remove-Item Env:\PGPASSWORD

  if ($LASTEXITCODE -ne 0) { throw "pg_dump exited with code $LASTEXITCODE" }
  Log "OK: backed up to $outFile ($((Get-Item $outFile).Length) bytes)"

  $cutoff = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem $BackupDir -Filter 'apex_db_*.dump' | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Log "Pruned old backup: $($_.Name)"
  }
} catch {
  Log "ERROR: $_"
  if (Test-Path Env:\PGPASSWORD) { Remove-Item Env:\PGPASSWORD }
  exit 1
}
