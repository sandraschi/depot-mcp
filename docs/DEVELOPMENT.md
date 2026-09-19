# Development — depot-mcp

## Quick loop

```powershell
just bootstrap   # uv sync + pre-commit install
just lint        # ruff check + format --check
just test        # pytest -v
just serve       # full stack via web_sota/start.ps1
just mcp         # stdio server (probes :10727 /mcp first, proxies if up)
```

## Justfile rule (Windows)

`just` runs each recipe **line** as its own `powershell.exe` — `Set-Location`
on one line never affects the next. Join multi-step bodies with `; ` or use
absolute `{{justfile_directory()}}` paths. Commit e50e0d0 fixed this once;
do not regress it.

## Gates

- `uv run ruff check src/` (T20 print ban on; S110/S112 must stay out of ignore)
- `uv run ruff format src/ --check`
- `uv run pytest tests/ -q` (fleet_errors fixture needs `DepoMCPServer.fleet_error_store`)
- `npx tsc --noEmit` in `web_sota/frontend` (JSX literal braces need `{'{'}` escaping)

## Debugging the backend

- Capabilities: `GET http://127.0.0.1:10727/api/capabilities`
- Diagnostics: `GET http://127.0.0.1:10727/api/v1/diagnostics`
- Logs: uvicorn stdout in the backend window; `data/fleet_errors.sqlite3` for fleet telemetry.
- Zombie port: `Get-NetTCPConnection -LocalPort 10727 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
