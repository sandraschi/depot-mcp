# Tools — depot-mcp

Three portmanteau MCP tools (see `docs/mcp-tools.md` for the full manifest).

| Tool | Actions | Notes |
|---|---|---|
| `depot_management` | upload, download, search, stats, migrate, delete, tag | Tier-aware file CRUD + hybrid search |
| `depot_backup` | list, status, backup, restore | All repo depots + memops vault (vault *.md is source; db/vectors are derivatives) |
| `fleet_errors` | ingest, query, stats | fleet_error/v1 sink; dedupe on (server, ts); ring 10k |

## REST surface (FastAPI :10727)

- `GET /health`, `GET /api/capabilities`, `GET /api/status`, `GET /api/skills`
- `GET /api/v1/diagnostics`, `GET /api/v1/logs` (ring buffer, `?level=&limit=`)
- `POST /api/shutdown` — orderly exit (200 now, exit 500 ms later)
- `/api/v1/depot/*` — upload/download/search/stats/files/migrate/import
- `/api/backup/*` — list/status/backup/vault/restore
- `/api/fleet/*` — advertise/unadvertise/advertised/discover
- `/api/v1/fleet/errors/*` — ingest/query/stats
- `/api/llm/*` — providers/register/models/load/chat/chat-stream/discover/onboarding
- SPA served under `/app` when `web_sota/frontend/dist` exists (matches vite base + router basename)

## Pages (every tool op has a UI)

| Page | Exercises |
|---|---|
| Dashboard / Stats / Browse / Search / Upload / FileDetail | depot_management: stats, files, search, upload, download, tag, delete, **migrate** |
| Import | depot import (dry-run + commit) + fleet advertise/discover |
| Settings | depot_backup (list/status/backup/restore) + LLM provider cards |
| Errors | fleet_errors query (all filters) + stats |
| Chat | llm chat/stream/models + skills as preprompt |
| Logs | ring-buffer log tail + level filter |
| Tools | capabilities + diagnostics |
