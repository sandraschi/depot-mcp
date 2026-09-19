# depot-mcp — Agent Instructions

Centralized fleet file depot: tiered NVMe/spinner storage, LanceDB vector +
SQLite FTS5 search, FastMCP 3.4 + FastAPI gateway, Vite dashboard, Tauri shell.

## Entry points

- `src/depot_mcp/server.py` — `DepoMCPServer` (FastMCP + FastAPI, CORS, routes)
- `src/depot_mcp/__main__.py` — CLI: stdio (probes :10727 /mcp first) / http / sse
- `web_sota/backend/server.py` — `python -m web_sota.backend.server --port 10727`
- `web_sota/frontend/` — Vite React dashboard (:10726, proxies /api + /mcp)
- `native/` — Tauri 2 shell (frontendDist ../web_sota/frontend/dist)

## Ports (fleet registry + code agree)

Backend **10727**, frontend **10726**. Health: `GET /api/capabilities`,
`GET /health`. Shutdown: `POST /api/shutdown`. Diagnostics:
`GET /api/v1/diagnostics`.

## Key files

- `src/depot_mcp/tools/depot_tool.py` — `depot_management` portmanteau
- `src/depot_mcp/tools/backup_tool.py` — `depot_backup` portmanteau
- `src/depot_mcp/tools/fleet_errors_tool.py` + `fleet_errors.py` — fleet_error/v1 sink
- `src/depot_mcp/config.py` — `DepoConfig` (DEPOT_ env prefix, tier roots)
- `fleet-start.config.ps1` — launcher config (edit ports here, not start.ps1)
- `justfile` — recipes join multi-step bodies with `;` (Set-Location dies per line)

## Standards

- FastMCP >=3.4.4,<4; portmanteau tools; `## Return Format` + `## Examples` docstrings
- `Annotated[T, Field(...)]`, no `Args:` blocks; Pydantic v2 (`.model_dump()`)
- Returns carry `{success, action, data, error}`; no bare `except:`; no `print()` in src (T20)
- S110/S112 must never be in ruff ignore. `uv run` everything, never naked python.
- Max 5 files per commit; 3+ file batches need timestamped `.bak` first.
