# Configuration — depot-mcp

All settings via `DEPOT_` env vars (see `.env.example`) or `DepoConfig.from_yaml()`.

| Var | Default | Meaning |
|---|---|---|
| `DEPOT_FAST_ROOT` | `D:\depot\fast` | NVMe hot tier root (auto-created) |
| `DEPOT_SLOW_ROOT` | `E:\depot\slow` | HDD cold tier root (auto-created) |
| `DEPOT_TIER_POLICY` | `lru` | `lru` \| `explicit` \| `tag_based` |
| `DEPOT_LRU_TTL_DAYS` | `7` | Cold threshold for LRU migration |
| `DEPOT_CHUNK_SIZE_MB` | `64` | Large-upload chunk size |
| `DEPOT_MAX_UPLOAD_SIZE_GB` | `100` | Upload cap |
| `DEPOT_HOST` / `DEPOT_PORT` | `127.0.0.1` / `10727` | Backend bind |
| `DEPOT_EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | fastembed model (384d) |
| `DEPOT_MCP_LLM_GLOM` | `1` | Probe Ollama :11434 / LM Studio :1234 on boot |
| `DEPOT_MCP_API_URL` | `http://127.0.0.1:10727/mcp` | stdio→HTTP probe target |

Frontend dev port: 10726 (vite.config.ts + `fleet-start.config.ps1`).
Launcher: edit `fleet-start.config.ps1`, never `start.ps1` logic.
Orderly shutdown: `POST /api/shutdown` (used by the fleet launcher before restarts).
