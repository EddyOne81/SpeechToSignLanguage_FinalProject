Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root        = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "client-ui"
$AiDir       = Join-Path $Root "TestAIService"
$PidDir      = Join-Path $Root ".local"
$PidFile     = Join-Path $PidDir "run-local.pids.json"
$EnvFile     = Join-Path $Root ".env"

# ── Load .env if present ─────────────────────────────────────────────────────
if (Test-Path -LiteralPath $EnvFile) {
    Write-Host "Loading environment from .env ..."
    foreach ($line in Get-Content -LiteralPath $EnvFile) {
        $line = $line.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { continue }
        $parts = $line -split "=", 2
        if ($parts.Count -ne 2) { continue }
        $key = $parts[0].Trim()
        $val = $parts[1].Trim().Trim('"').Trim("'")
        # Only set if not already defined in the shell session.
        if (-not [System.Environment]::GetEnvironmentVariable($key, "Process")) {
            [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
            Set-Item -Path "Env:$key" -Value $val
        }
    }
}

# ── Helpers ──────────────────────────────────────────────────────────────────
function Assert-CommandExists {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing command '$Name'. $Hint"
    }
}

function Assert-PathExists {
    param([string]$Path, [string]$Message)
    if (-not (Test-Path -LiteralPath $Path)) { throw $Message }
}

function Get-ListeningPid {
    param([int]$Port)
    $pattern = "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$"
    foreach ($line in (netstat -ano -p tcp 2>$null)) {
        if ($line -match $pattern) { return [int]$Matches[1] }
    }
    return $null
}

function Assert-PortAvailable {
    param([int]$Port, [string]$ServiceName)
    $listeningPid = Get-ListeningPid -Port $Port
    if (-not $listeningPid) { return }
    $owner = "PID $listeningPid"
    try { $p = Get-Process -Id $listeningPid -ErrorAction Stop; $owner = "$($p.ProcessName) (PID $listeningPid)" } catch {}
    throw "Port $Port is in use by $owner. Cannot start $ServiceName."
}

function Start-HiddenProcess {
    param([string]$WorkDir, [string]$Command)
    return Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
        -WorkingDirectory $WorkDir `
        -WindowStyle Hidden `
        -PassThru
}

# ── Check required tools ─────────────────────────────────────────────────────
Assert-PathExists -Path $BackendDir  -Message "Missing backend/ directory."
Assert-PathExists -Path $FrontendDir -Message "Missing client-ui/ directory."
Assert-PathExists -Path $AiDir       -Message "Missing TestAIService/ directory."

Assert-CommandExists -Name "java" -Hint "Install JDK 21."
Assert-CommandExists -Name "node" -Hint "Install Node.js 20+."
Assert-CommandExists -Name "npm"  -Hint "Install npm."
Assert-PathExists -Path (Join-Path $BackendDir "mvnw.cmd") -Message "Missing backend/mvnw.cmd."

# ── Require GROQ_API_KEY ─────────────────────────────────────────────────────
if (-not $env:GROQ_API_KEY) {
    Write-Host ""
    Write-Host "ERROR: GROQ_API_KEY is not set." -ForegroundColor Red
    Write-Host ""
    Write-Host "  1. Copy .env.example to .env"
    Write-Host "  2. Set GROQ_API_KEY=<your-key>  (get a free key at https://console.groq.com)"
    Write-Host "  3. Re-run this script."
    Write-Host ""
    exit 1
}

# ── Auto-setup Python venv if missing ────────────────────────────────────────
$venvActivate = Join-Path $AiDir ".venv\Scripts\Activate.ps1"
$venvPip      = Join-Path $AiDir ".venv\Scripts\pip.exe"

if (-not (Test-Path -LiteralPath $venvActivate)) {
    Write-Host ""
    Write-Host "Python venv not found — creating it now (first-time setup, may take a few minutes)..." -ForegroundColor Yellow
    Assert-CommandExists -Name "python" -Hint "Install Python 3.11+."

    Push-Location $AiDir
    try {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw "python -m venv failed." }
        & $venvPip install --upgrade pip -q
        & $venvPip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) { throw "pip install -r requirements.txt failed." }
        Write-Host "Python venv setup complete." -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

Assert-PathExists -Path $venvActivate -Message "Python venv setup failed. Run manually: cd TestAIService && python -m venv .venv && .venv\Scripts\pip install -r requirements.txt"

# ── Check ports ──────────────────────────────────────────────────────────────
Assert-PortAvailable -Port 8000 -ServiceName "AI service"
Assert-PortAvailable -Port 8080 -ServiceName "Spring backend"
Assert-PortAvailable -Port 5173 -ServiceName "Frontend"

if (-not (Test-Path -LiteralPath $PidDir)) {
    New-Item -ItemType Directory -Path $PidDir | Out-Null
}

# ── Build launch commands ────────────────────────────────────────────────────
# Child processes inherit the parent's environment block, so GROQ_API_KEY is
# already available inside each hidden PowerShell window without explicit passing.

$aiCommand = @"
& '$venvActivate'
uvicorn main:app --host 127.0.0.1 --port 8000
"@

$backendCommand = @"
`$env:FRONTEND_URL = 'http://localhost:5173'
& '.\mvnw.cmd' spring-boot:run
"@

$frontendCommand = @"
`$env:VITE_BACKEND_URL = ''
npm run dev -- --port 5173
"@

# ── Launch ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan

$aiProc       = Start-HiddenProcess -WorkDir $AiDir       -Command $aiCommand
$backendProc  = Start-HiddenProcess -WorkDir $BackendDir  -Command $backendCommand
$frontendProc = Start-HiddenProcess -WorkDir $FrontendDir -Command $frontendCommand

$pidData = [ordered]@{
    createdAt   = (Get-Date).ToString("o")
    rootPath    = $Root
    aiPid       = $aiProc.Id
    backendPid  = $backendProc.Id
    frontendPid = $frontendProc.Id
}

$pidData | ConvertTo-Json | Set-Content -LiteralPath $PidFile -Encoding UTF8

Write-Host ""
Write-Host "All three services are starting in the background." -ForegroundColor Green
Write-Host ""
Write-Host ("  AI Service  PID {0,-6}  -> http://127.0.0.1:8000" -f $aiProc.Id)
Write-Host ("  Backend     PID {0,-6}  -> http://127.0.0.1:8080  (Spring Boot takes ~30s to start)" -f $backendProc.Id)
Write-Host ("  Frontend    PID {0,-6}  -> http://localhost:5173" -f $frontendProc.Id)
Write-Host ""
Write-Host "  Open your browser: http://localhost:5173"
Write-Host ""
Write-Host "  To stop all services: .\stop-local.ps1"
Write-Host "  PID file: $PidFile"
