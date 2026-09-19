# Tools — depot-mcp

Three portmanteau MCP tools (see `docs/mcp-tools.md` for the full manifest).

| Tool | Actions | Notes |
|---|---|---|
| `depot_management` | upload, download, search, stats, migrate, delete, tag | Tier-aware file CRUD + hybrid search |
| `depot_backup` | list, status, backup, restore | All repo depots + memops vault (vault *.md is source; db/vectors are derivatives) |
| `fleet_errors` | ingest, query, stats | fleet_error/v1 sink; dedupe on (server, ts); ring 10k |

## REST surface (FastAPI :10727)

- `GET /health`, `GET /api/capabilities`, `GET /api/v1/diagnostics`
- `POST /api/shutdown` — orderly exit (200 now, exit 500 ms later)
- `/api/v1/depot/*` — upload/download/search/stats/files/migrate/import
- `/api/backup/*` — list/status/backup/vault/restore
- `/api/fleet/*` — advertise/unadvertise/advertised/discover
- `/api/v1/fleet/errors/*` — ingest/query/stats
- `/api/llm/*` — providers/models/chat (non-streaming; streaming + discover + onboarding are open gaps)
