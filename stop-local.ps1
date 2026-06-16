Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path (Join-Path $Root ".local") "run-local.pids.json"

if (-not (Test-Path -LiteralPath $PidFile)) {
    Write-Host "PID file not found: $PidFile"
    exit 0
}

$pidData = Get-Content -LiteralPath $PidFile | ConvertFrom-Json
$targetPids = @($pidData.aiPid, $pidData.backendPid, $pidData.frontendPid) | Where-Object { $_ }

foreach ($procId in $targetPids) {
    try {
        Stop-Process -Id $procId -Force -ErrorAction Stop
        Write-Host "Stopped PID: $procId"
    } catch {
        Write-Host "PID not running or inaccessible: $procId"
    }
}

Remove-Item -LiteralPath $PidFile -Force
Write-Host "Done. Removed PID file."
