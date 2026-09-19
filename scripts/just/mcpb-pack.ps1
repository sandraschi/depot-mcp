# depot-mcp MCPB pack - fresh stage (wipe+recopy) then pack.
# Never edit mcpb/src/ by hand; it is regenerated here on every pack.
param(
    [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".." "..")).Path
$Stage = Join-Path $RepoRoot "mcpb\src\depot_mcp"
$Src = Join-Path $RepoRoot "src\depot_mcp"

if (-not (Test-Path -LiteralPath $Src)) { throw "src/depot_mcp not found at $Src" }

# 1. Fresh stage
if (Test-Path -LiteralPath $Stage) { Remove-Item -Recurse -Force -LiteralPath $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
Copy-Item -Recurse -Force -Path (Join-Path $Src "*") -Destination $Stage

# 2. Stage hygiene: no pycache / pyc / bak
Get-ChildItem -Path (Join-Path $RepoRoot "mcpb") -Recurse -Include "__pycache__", "*.pyc", "*.bak", "*.bak.*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 3. Self-import check: bundle must import itself with only mcpb/src on sys.path
uv run --project $RepoRoot python -c "import sys,importlib.util as u; sys.path.insert(0,r'mcpb\src'); s=u.find_spec('depot_mcp'); print(s.origin if s else 'NOT FOUND'); assert s and r'mcpb\src' in s.origin"

# 4. Pack (needs mcpb CLI on PATH; otherwise stop with instructions, do not fake it)
$dist = Join-Path $RepoRoot "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Get-Command mcpb -ErrorAction SilentlyContinue) {
    mcpb pack $RepoRoot "$dist\depot-mcp-v$Version.mcpb"
} else {
    Write-Host "mcpb CLI not on PATH - stage verified at mcpb/src/depot_mcp. Pack manually: mcpb pack . dist/depot-mcp-v$Version.mcpb" -ForegroundColor Yellow
}
