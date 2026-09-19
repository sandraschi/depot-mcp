# depot-mcp — Copilot instructions

Fleet file depot (FastMCP 3.4 + FastAPI :10727, Vite :10726, Tauri shell).

## Session Context (depot-mcp)

- Before starting work: probe `GET http://127.0.0.1:10727/api/capabilities`; read `CLAUDE.md`.
- Recall: `depot_management` (upload/download/search/stats/migrate/delete/tag),
  `depot_backup` (list/status/backup/restore), `fleet_errors` (ingest/query/stats).
- Storage tiers via `DepoConfig.from_env()` (DEPOT_FAST_ROOT / DEPOT_SLOW_ROOT).
- At end of work: `uv run ruff check src/` + `uv run pytest tests/ -q`; <=5 files per commit.
