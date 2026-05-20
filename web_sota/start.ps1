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
$backendJob = Start-Job -Name "depot-backend" -ScriptBlock {
    param($port, $repo, $uvExe)
    Set-Location $repo
    & $uvExe run python -m web_sota.backend.server --port $port 2>&1 | Out-File "$env:TEMP\depot-backend.log"
} -ArgumentList $BackendPort, $repoDir, $uvPath

# Wait for backend readiness
Write-Host "[backend] Waiting for readiness..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    # Bail early if the backend job died prematurely
    if ($backendJob.State -eq "Failed" -or $backendJob.State -eq "Completed") {
        Write-Host "[backend] Process exited prematurely (state=$($backendJob.State))" -ForegroundColor Red
        $backendJob | Receive-Job -ErrorAction SilentlyContinue
        if (Test-Path "$env:TEMP\depot-backend.log") {
            Write-Host "[backend] Last log lines:" -ForegroundColor Red
            Get-Content "$env:TEMP\depot-backend.log" -Tail 20
        }
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
    Write-Host "[backend] Failed to reach after 90s. Dumping job output:" -ForegroundColor Red
    $backendJob | Receive-Job -ErrorAction SilentlyContinue
    if (Test-Path "$env:TEMP\depot-backend.log") {
        Get-Content "$env:TEMP\depot-backend.log" -Tail 30
    }
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

# Start frontend in background
Write-Host "[frontend] Starting Vite dev server on :$FrontendPort..." -ForegroundColor Green
$frontendJob = Start-Job -Name "depot-frontend" -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    $env:VITE_PORT = $port
    npm run dev -- --port $port --host 127.0.0.1
} -ArgumentList $frontendDir, $FrontendPort

# Wait for frontend readiness, then open browser
Write-Host "[frontend] Waiting for readiness..." -ForegroundColor Gray
$feReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    # Bail early if the frontend job died prematurely
    if ($frontendJob.State -eq "Failed" -or $frontendJob.State -eq "Completed") {
        Write-Host "[frontend] Process exited prematurely (state=$($frontendJob.State))" -ForegroundColor Red
        $frontendJob | Receive-Job -ErrorAction SilentlyContinue
        break
    }
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$FrontendPort" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) {
            $feReady = $true
            Write-Host "[frontend] Ready on http://127.0.0.1:$FrontendPort" -ForegroundColor Green
            Start-Process "http://127.0.0.1:$FrontendPort/app/"
            break
        }
    } catch {}
}
if (-not $feReady) {
    Write-Host "[frontend] Frontend not reachable, continuing anyway" -ForegroundColor Yellow
}

# Wait for frontend job (blocking)
Write-Host "[frontend] Dashboard open in browser. Press Ctrl+C to stop." -ForegroundColor Gray
Wait-Job -Name "depot-frontend" -ErrorAction SilentlyContinue | Out-Null

# Cleanup on exit
Write-Host "[backend] Stopping..." -ForegroundColor Yellow
Stop-Job -Name "depot-backend" -ErrorAction SilentlyContinue
Remove-Job -Name "depot-backend" -Force -ErrorAction SilentlyContinue
