param(
    [switch]$Automated
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "ÔòöÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòù" -ForegroundColor Cyan
Write-Host "Ôòæ        depot-mcp - Fleet File Depot           Ôòæ" -ForegroundColor Cyan
Write-Host "ÔòÜÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòØ" -ForegroundColor Cyan

# Delegate to web_sota
$wsDir = Join-Path $scriptDir "web_sota"
if (-not (Test-Path -LiteralPath (Join-Path $wsDir "start.ps1"))) {
    Write-Host "[ERROR] web_sota/start.ps1 not found at $wsDir" -ForegroundColor Red
    exit 1
}

& (Join-Path $wsDir "start.ps1") @PSBoundParameters
