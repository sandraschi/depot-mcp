# Pre-commit Biome guard — checks all fleet web roots that exist.
# Invoked by .pre-commit-config.yaml (local biome hook). Check-only, never writes.
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Candidates = @("web_sota/frontend", "web_sota", "webapp/frontend", "webapp", "web", "frontend")
$Failed = $false
foreach ($rel in $Candidates) {
    $dir = Join-Path $RepoRoot $rel
    $pkg = Join-Path $dir "package.json"
    if (-not (Test-Path -LiteralPath $pkg)) { continue }
    $text = Get-Content -Raw -LiteralPath $pkg
    if ($text -notmatch '"@biomejs/biome"|"biome"') { continue }
    Write-Host "biome: checking $rel ..." -ForegroundColor Cyan
    Push-Location $dir
    try {
        npx biome check src/
        if ($LASTEXITCODE -ne 0) { $Failed = $true }
    } finally { Pop-Location }
}
if ($Failed) { throw "biome check failed — run just fe-fix and re-stage" }
Write-Host "biome: clean" -ForegroundColor Green
