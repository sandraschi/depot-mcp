# Changelog — depot-mcp

## 2026-09-19 — assfix pass (SOTA compliance)

### Fixed (HIGH)

- Wired `FleetErrorStore` into `DepoMCPServer` + registered `fleet_errors` MCP tool
  and `/api/v1/fleet/errors/*` routes — 5 failing tests now pass (8/8 green).
- `tsc --noEmit` clean (Help.tsx `{id}` brace escaping, lucide-react declarations).
- Ruff: removed S110/S112 from ignore, added T20 print ban (+ per-file-ignores);
  `ruff format` clean.
- justfile: `Set-Location` joined per recipe (was silently wrong-directory on Windows);
  added `serve`/`web`/`fmt` recipes; `pack` now fresh-stages `src/` → `mcpb/src/`.
- Tauri: `frontendDist` corrected to `../web_sota/frontend/dist`; backend log strings
  use `BACKEND_PORT`; CSP allows :10727; `@tauri-apps/api` added to frontend deps.
- CORS: unconditional LAN/Tailscale `allow_origin_regex` added.
- Added `POST /api/shutdown` (orderly exit) and `GET /api/v1/diagnostics`.
- glama.json now lists all 3 tools. Added `.env.example`.
- `.gitignore`/`.mcpbignore` cover `reports/`, `data/*.sqlite3*`, `*.bak(*)`.

### Added

- `CLAUDE.md`, session-context sections (`.cursorrules`/`.windsurfrules`/copilot),
  docs stack (CONFIGURATION/DEVELOPMENT/TOOLS), plugin hook skeleton.

### Deferred (needs a bigger pass)

- Dashboard hero, onboarding flow, chat SOTA (personalities, skill-first,
  streaming), Zustand store, Inbox/Skills/Logs pages, coverage threshold + e2e,
  bun migration, WEBAPP_PORTS.md registry correction (mcd repo).
