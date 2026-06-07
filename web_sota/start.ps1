param(
    [switch]$Automated
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path $scriptDir -Parent

$FrontendPort = 10726
$BackendPort = 10727

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  depot-mcp - Fleet File Depot" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Kill port squatters
$killed = $false
foreach ($port in @($FrontendPort, $BackendPort)) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Killing process on port $port (PID $($proc.Id): $($proc.ProcessName))" -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $killed = $true
        }
    }
}
# Let the OS release the socket before binding again (avoids "Address already in use")
if ($killed) {
    Write-Host "[backend] Waiting for ports to release..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

# Start backend from repo root so -m web_sota.backend.server resolves
$uvPath = if (Get-Command "C:\Users\sandr\.local\bin\uv.exe" -ErrorAction SilentlyContinue) { "C:\Users\sandr\.local\bin\uv.exe" } else { "uv" }
Write-Host "[backend] Starting FastAPI + FastMCP on :$BackendPort..." -ForegroundColor Green
$backendCmd = "Set-Location '$repoDir'; & '$uvPath' run python -m web_sota.backend.server --port $BackendPort"
$BackendProc = Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Normal", "-Command", $backendCmd -PassThru

# Wait for backend readiness
Write-Host "[backend] Waiting for readiness..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    # Bail early if the backend job died prematurely
    if ($BackendProc.HasExited) {
        Write-Host "[backend] Process exited prematurely (exit=$($BackendProc.ExitCode))" -ForegroundColor Red
        exit 1
    }
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/api/capabilities" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $ready = $true
            Write-Host "[backend] Ready on http://127.0.0.1:$BackendPort" -ForegroundColor Green
            break
        }
    }
    catch { }
}
if (-not $ready) {
    Write-Host "[backend] Failed to reach /api/capabilities after 90s." -ForegroundColor Red
    exit 1
}

# Setup SMB share if admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    $shareName = "depot"
    $fastRoot = $env:DEPOT_FAST_ROOT
    if (-not $fastRoot) { $fastRoot = "D:\depot\fast" }
    if (-not (Test-Path -LiteralPath $fastRoot)) {
        New-Item -ItemType Directory -Path $fastRoot -Force | Out-Null
    }
    if (-not (Get-SmbShare -Name $shareName -ErrorAction SilentlyContinue)) {
        New-SmbShare -Name $shareName -Path $fastRoot -FullAccess "Everyone" -Description "depot-mcp fleet file storage"
        Write-Host "[smb] Share created: \\$env:COMPUTERNAME\$shareName" -ForegroundColor Green
    }
    else {
        Write-Host "[smb] Share exists: \\$env:COMPUTERNAME\$shareName" -ForegroundColor Gray
    }
}

# Ensure frontend deps
$frontendDir = Join-Path $scriptDir "frontend"
if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "node_modules"))) {
    Write-Host "[frontend] Installing dependencies..." -ForegroundColor Yellow
    Set-Location $frontendDir
    npm install
}

Set-Location $frontendDir
Write-Host "[frontend] Starting Vite dev server on :$FrontendPort..." -ForegroundColor Green
npm run dev -- --port $FrontendPort --host 127.0.0.1 --strictPort
