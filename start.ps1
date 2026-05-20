param(
    [switch]$Automated
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        depot-mcp — Fleet File Depot           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan

# Delegate to web_sota
$wsDir = Join-Path $scriptDir "web_sota"
if (-not (Test-Path -LiteralPath (Join-Path $wsDir "start.ps1"))) {
    Write-Host "[ERROR] web_sota/start.ps1 not found at $wsDir" -ForegroundColor Red
    exit 1
}

& (Join-Path $wsDir "start.ps1") @PSBoundParameters
