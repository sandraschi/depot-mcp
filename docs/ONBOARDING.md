# Onboarding — depot-mcp

## What this is for

depot-mcp is the fleet's permanent file home: every MCP server's ad-hoc depot moves here, onto tiered storage (NVMe + HDD) with hybrid vector/keyword search. It does **not** replace your repos - it stores the big, generated, or shared files (models, CAD, datasets, exports) so repos stay lean. No account, no cloud, no money: everything runs on Goliath (or your own machine).

## Cost and accounts (money / CC)

| Question | Answer |
|----------|--------|
| Do I need an account? | No |
| Free tier? | Everything is free and local |
| Credit card required? | No |
| Ongoing cost? | Disk space only |
| Who bills? | Nobody |

Optional: a cloud LLM key (OpenAI-compatible) if you want cloud chat instead of free local Ollama/LM Studio.

## Prerequisites outside this repo

- Two storage locations (defaults auto-created on first boot):
  - Fast tier: `D:\depot\fast` (set `DEPOT_FAST_ROOT` to move it)
  - Slow tier: `E:\depot\slow` (set `DEPOT_SLOW_ROOT` to move it)
- For AI chat (recommended, still free): **Ollama** (https://ollama.com) or **LM Studio** - auto-detected on `:11434` / `:1234`
- Optional: NVIDIA GPU speeds up vector reindex (`just rag-gpu`); CPU works fine

## First-timer setup steps

1. `just bootstrap`, then `just serve` (or `.\web_sota\start.bat`)
2. Open the dashboard at `http://127.0.0.1:10726` - tier cards should show live (possibly zero) numbers
3. Install Ollama, run `ollama pull llama3.2`, reload the dashboard - the LLM dot should turn green
4. Upload a file (dashboard Quick Actions) and search for it - both search engines should hit

## Pitfalls

- **Port zombies:** a previous backend on `:10727` blocks startup. Clear it: `Get-NetTCPConnection -LocalPort 10727 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
- **Tier dirs on the wrong drive:** set `DEPOT_FAST_ROOT`/`DEPOT_SLOW_ROOT` in `.env` (copied from `.env.example`) *before* first upload - moving files later means re-migration
- **Something already on `:11434`:** the LLM probe gloms whatever answers there. If chat acts weird, check what is actually listening on 11434
- **Reindex is offline:** vector reindex runs via `just rag` (CPU) / `just rag-gpu`, not via the web UI - large imports need a reindex pass before semantic search sees them

## Sanity check

- `GET http://127.0.0.1:10727/api/capabilities` returns `"status": "ok"`
- `GET http://127.0.0.1:10727/api/llm/onboarding` returns `"configured": true` plus a recommended path
- Dashboard shows green backend dot and (with Ollama up) green LLM dot
- Upload + search round-trip works

## Declared doubles

- Until a local LLM is detected, Chat shows an honest empty provider list and the dashboard shows a red onboarding CTA - no fake providers, no fake models
- The dashboard never shows sample/mock files: fresh installs show live zeros, which is the truth
- `just rag` scripts are the only index writers; the web UI triggers no background embedding jobs
