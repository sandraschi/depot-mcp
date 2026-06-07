set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

# Open the interactive recipe dashboard in the browser
default:
    @just --list

# ── Quality ───────────────────────────────────────────────────────────────────

# Ruff linting
lint:
    Set-Location '{{justfile_directory()}}'
    uv run ruff check .

# Ruff fix + format
fix:
    Set-Location '{{justfile_directory()}}'
    uv run ruff check . --fix --unsafe-fixes
    uv run ruff format .

# Run test suite
test:
    Set-Location '{{justfile_directory()}}'
    uv run pytest -v

# ── Hardening ─────────────────────────────────────────────────────────────────

# Bandit security audit
check-sec:
    Set-Location '{{justfile_directory()}}'
    uv run bandit -r src/

# Safety dependency audit
audit-deps:
    Set-Location '{{justfile_directory()}}'
    uv run safety check

# ── Frontend ───────────────────────────────────────────────────────────────────

# Run Biome lint on frontend
fe-lint:
    Set-Location '{{justfile_directory()}}/web_sota/frontend'
    npx biome check

# Run Biome fix on frontend
fe-fix:
    Set-Location '{{justfile_directory()}}/web_sota/frontend'
    npx biome check --fix --unsafe

# ── Development ───────────────────────────────────────────────────────────────

# Start the full stack (calls web_sota/start.ps1)
run:
    Set-Location '{{justfile_directory()}}'
    pwsh -ExecutionPolicy Bypass -File "web_sota/start.ps1"

# MCP server stdio mode
mcp:
    Set-Location '{{justfile_directory()}}'
    uv run depot-mcp --transport stdio

# MCP server HTTP mode
mcp-http:
    Set-Location '{{justfile_directory()}}'
    uv run depot-mcp --transport http --port 10727

# MCP server SSE mode with agentic CodeMode
mcp-agentic:
    Set-Location '{{justfile_directory()}}'
    uv run depot-mcp --transport sse --port 10727 --agentic

# ── Packaging ─────────────────────────────────────────────────────────────────

# Build MCPB package
pack:
    Set-Location '{{justfile_directory()}}'
    if (Test-Path 'mcpb.json') { Write-Host 'MCPB config found' -ForegroundColor Green }
    Write-Host 'Run: mcpb pack . dist/depot-mcp.mcpb' -ForegroundColor Gray

# ── LLM ───────────────────────────────────────────────────────────────────────

# Check Ollama availability
ollama-check:
    try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 -ErrorAction SilentlyContinue; if ($r.StatusCode -eq 200) { Write-Host 'Ollama: ONLINE' -ForegroundColor Green } else { Write-Host 'Ollama: DOWN' -ForegroundColor Red } } catch { Write-Host 'Ollama: NOT FOUND' -ForegroundColor Yellow }

# List loaded Ollama models
ollama-models:
    try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5 -ErrorAction Stop; ($r.Content | ConvertFrom-Json).models | ForEach-Object { Write-Host "  $($_.name)" } } catch { Write-Host 'Ollama not reachable' -ForegroundColor Red }

# ── Maintenance ───────────────────────────────────────────────────────────────

# Clean venv + node_modules
clean:
    Set-Location '{{justfile_directory()}}'
    Remove-Item -Recurse -Force -LiteralPath '.venv' -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force -LiteralPath 'web_sota/frontend/node_modules' -ErrorAction SilentlyContinue
    Write-Host 'Cleaned .venv and node_modules'

