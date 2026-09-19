# Troubleshooting — depot-mcp

## Backend won't start / port busy

**Symptom:** `start.ps1` exits or the dashboard shows Offline.
**Fix:** clear the zombie, then restart:
```powershell
Get-NetTCPConnection -LocalPort 10727 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
.\web_sota\start.ps1
```

## Dashboard shows Offline but backend runs

**Symptom:** Topbar red Offline, `curl http://127.0.0.1:10727/health` returns ok.
**Fix:** the Vite proxy targets `127.0.0.1:10727` - make sure you opened the frontend (`:10726`), not the backend URL directly. Check `web_sota/frontend/vite.config.ts` proxy section.

## Chat says "LLM provider unreachable" (503)

**Symptom:** 503 from `/api/llm/chat` or `/api/llm/chat/stream`.
**Fix:** no usable provider. Install Ollama (`ollama pull llama3.2`) or start LM Studio, then reload - providers glom automatically. Verify: `GET /api/llm/discover`.

## Something answers on :11434 but chat fails

**Symptom:** provider detected, chat 503s with 404 on `/api/generate`.
**Fix:** another service squats on 11434. Either stop it or register the real Ollama explicitly: `POST /api/llm/providers/register` with the correct base URL.

## Search misses recently imported files

**Symptom:** keyword search hits, semantic search misses (or vice versa).
**Fix:** run a reindex pass - the web UI never embeds in the background:
```powershell
just rag        # CPU
just rag-gpu    # NVIDIA (after just rag-gpu-install)
```

## Tests fail with `fleet_error_store` AttributeError

**Symptom:** legacy checkout; `DepoMCPServer` has no `fleet_error_store`.
**Fix:** pull latest - the store is wired in `DepoMCPServer.__init__` since the 2026-09-19 assfix. Never construct a partial server in new tests; use the `api_client` fixture pattern in `tests/test_api_surface.py`.

## `tsc --noEmit` fails on lucide-react types

**Symptom:** TS7016 `Could not find a declaration file for module 'lucide-react'`.
**Fix:** `src/lucide-react.d.ts` covers the old CJS dist. Long-term fix is upgrading `lucide-react` to a version that bundles types, then deleting the shim.

## Pre-commit hook fails with `UnexpectedToken` on push

**Symptom:** commit-time biome hook shows a parse error contradicting the file on disk.
**Fix:** you committed with `git commit -- <pathspec>` - see `TRAPS_AND_PITFALLS.md` #38. Stage the batch with `git add`, then full `git commit -m`.

## Tauri bundles an empty UI

**Symptom:** installed app shows blank page.
**Fix:** `native/tauri.conf.json` `frontendDist` must be `../web_sota/frontend/dist` (not `../webapp/dist`). Rebuild the frontend first, then `just build-native`.
