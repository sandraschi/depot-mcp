# Changelog — depot-mcp

## 2026-09-19 (night) — pages audit: every tool op now has a UI

New: Fleet Errors explorer page (all query filters + stats), FileDetail
tier-migrate buttons, Tools diagnostics card. Fixed three upload-chain bugs
the audit's round-trip test caught: `UploadFile` imported inside the route
factory (annotation never resolved - upload 500'd for every caller), sync
`file.file.read()` awaited, `if not self.table` falsy on empty LanceDB
tables, last-row delete crashing on schema-less rewrite, `/app` SPA mount
so vite base + router basename resolve in production. e2e 4/4 live green.
Untracked live sqlite wal/shm.

## 2026-09-19 (evening) — deferred backlog cleared

Backend: `GET /api/status`, `/api/skills`, `/api/v1/logs` (ring buffer);
LLM `discover` (probes + GPU) / `onboarding` / `chat/stream` (SSE, streamId first);
provider transport errors map to 503, not 500. Fixed `register_prompts`
(bare functions are rejected by FastMCP 3.4 - the 4 advertised prompts never
registered). Canonical CORS regex (Tailscale + LAN + Goliath).

Frontend: zustand `store/llm.ts` (provider/model persistence), `useZoom`
(Ctrl+Scroll, Ctrl+0, `tauri-zoom` key, CSS fallback), skill-first Chat
(4 personalities + custom, 100-msg localStorage cap, export/clear, SSE
streaming, full testids), Dashboard hero + red onboarding CTA, Topbar health
poll with backoff, Inbox/Skills/Logs pages, Settings LLM provider cards
(detect/test/key-register server-side only), per-page testids, contrast pass.

Quality: 25 pytest green, coverage ratchet `--cov-fail-under=40` (actual 44%);
Playwright `e2e/smoke.spec.ts` 3/3 green against the live stack; bun.lock
committed (npm -> bun), package-lock removed; `docs/ONBOARDING.md`,
`docs/TROUBLESHOOTING.md`. Backend cold start is slow (~60s, embedding load).

Residual: no Apps Hub fleet-discovery page; Help/browse tables keep dense
`text-xs` (tabular data, justified); coverage thin spots (backup/depot tools,
importers); `pyright` not installed locally so the type gate is CI-only.

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
