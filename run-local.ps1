Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "client-ui"
$AiDir = Join-Path $Root "TestAIService"
$PidDir = Join-Path $Root ".local"
$PidFile = Join-Path $PidDir "run-local.pids.json"

function Assert-CommandExists {
    param([string]$CommandName, [string]$Hint)
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Missing command '$CommandName'. $Hint"
    }
}

function Assert-PathExists {
    param([string]$PathToCheck, [string]$Message)
    if (-not (Test-Path -LiteralPath $PathToCheck)) {
        throw $Message
    }
}

function Start-HiddenProcess {
    param(
        [string]$WorkDir,
        [string]$Command
    )

    $proc = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
        -WorkingDirectory $WorkDir `
        -WindowStyle Hidden `
        -PassThru

    return $proc
}

function Get-ListeningPid {
    param([int]$Port)
    $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$"
    $lines = netstat -ano -p tcp 2>$null
    foreach ($line in $lines) {
        if ($line -match $pattern) {
            return [int]$Matches[1]
        }
    }
    return $null
}

function Assert-PortAvailable {
    param([int]$Port, [string]$ServiceName)
    $pidInUse = Get-ListeningPid -Port $Port
    if (-not $pidInUse) {
        return
    }

    $owner = "PID $pidInUse"
    try {
        $proc = Get-Process -Id $pidInUse -ErrorAction Stop
        $owner = "$($proc.ProcessName) (PID $pidInUse)"
    } catch {
        # Keep PID-only owner string.
    }

    throw "Port $Port is already in use by $owner. Cannot start $ServiceName."
}

Assert-PathExists -PathToCheck $BackendDir -Message "Missing backend directory."
Assert-PathExists -PathToCheck $FrontendDir -Message "Missing client-ui directory."
Assert-PathExists -PathToCheck $AiDir -Message "Missing TestAIService directory."

Assert-CommandExists -CommandName "java" -Hint "Install JDK 21."
Assert-CommandExists -CommandName "node" -Hint "Install Node.js 20+."
Assert-CommandExists -CommandName "npm" -Hint "Install npm."

$venvActivate = Join-Path $AiDir ".venv\\Scripts\\Activate.ps1"
Assert-PathExists -PathToCheck $venvActivate -Message "Missing Python venv activate script at TestAIService/.venv."
Assert-PathExists -PathToCheck (Join-Path $BackendDir "mvnw.cmd") -Message "Missing backend/mvnw.cmd."
Assert-PathExists -PathToCheck (Join-Path $FrontendDir "package.json") -Message "Missing client-ui/package.json."

Assert-PortAvailable -Port 8000 -ServiceName "AI service"
Assert-PortAvailable -Port 8080 -ServiceName "Spring backend"
Assert-PortAvailable -Port 5173 -ServiceName "Frontend"

if (-not (Test-Path -LiteralPath $PidDir)) {
    New-Item -ItemType Directory -Path $PidDir | Out-Null
}

$aiCommand = @"
& '$venvActivate'
uvicorn main:app --host 127.0.0.1 --port 8000
"@

$backendCommand = @"
& '.\mvnw.cmd' spring-boot:run
"@

$frontendCommand = @"
\$env:VITE_BACKEND_URL = 'http://127.0.0.1:8080'
npm run dev -- --host 127.0.0.1 --port 5173
"@

$aiProc = Start-HiddenProcess -WorkDir $AiDir -Command $aiCommand
$backendProc = Start-HiddenProcess -WorkDir $BackendDir -Command $backendCommand
$frontendProc = Start-HiddenProcess -WorkDir $FrontendDir -Command $frontendCommand

$pidData = [ordered]@{
    createdAt = (Get-Date).ToString("o")
    rootPath = $Root
    aiPid = $aiProc.Id
    backendPid = $backendProc.Id
    frontendPid = $frontendProc.Id
}

$pidData | ConvertTo-Json | Set-Content -LiteralPath $PidFile -Encoding UTF8

Write-Host "Started local services in background."
Write-Host "AI Service PID: $($aiProc.Id) (127.0.0.1:8000)"
Write-Host "Backend PID:    $($backendProc.Id) (127.0.0.1:8080)"
Write-Host "Frontend PID:   $($frontendProc.Id) (127.0.0.1:5173)"
Write-Host ""
Write-Host "PID file: $PidFile"
Write-Host "To stop quickly, run:"
Write-Host '  .\stop-local.ps1'
