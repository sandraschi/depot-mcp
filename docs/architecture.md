# Architecture Overview

**depot-mcp** is a dual-purpose system: a **FastMCP Server** for AI agents and a **REST API + Web Dashboard** for human operators. It sits permanently on Goliath PC, serving as the fleet's centralized file depot.

---

## High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        depot-mcp System                          │
│                                                                   │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐    │
│  │  React/Vite   │◄──►│   FastAPI REST   │◄──►│  FastMCP     │    │
│  │  Dashboard    │    │   (:10727)       │    │  SSE /stdio  │    │
│  │  (:10726)     │    │                  │    │              │    │
│  └──────────────┘    └───────┬───────────┘    └──────────────┘    │
│                              │                                     │
│               ┌──────────────┼──────────────┐                      │
│        ┌──────▼──────┐ ┌────▼─────┐ ┌───────▼───────┐            │
│        │  TierManager │ │FileStore │ │   SearchService│            │
│        │  LRU/Exp/Tag │ │(NVMe+HDD)│ │ LanceDB+FTS5  │            │
│        └──────────────┘ └──────────┘ └───────────────┘            │
│                              │                                     │
│               ┌──────────────┼──────────────┐                      │
│        ┌──────▼──────┐ ┌────▼─────┐ ┌───────▼───────┐            │
│        │  Ollama/     │ │ SMB Share│ │ Fleet         │            │
│        │  LM Studio   │ │ (fast)   │ │ Importers     │            │
│        └──────────────┘ └──────────┘ └───────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Storage Layer

### Tiered Storage

| Tier | Drives | Media | Access | Default Path |
| :--- | :--- | :--- | :--- | :--- |
| **fast** | C:, D:, N: | NVMe/SSD | Direct + SMB | `D:\depot\fast\` |
| **slow** | E:, F:, ... | HDD | API only | `E:\depot\slow\` |

### Tier Policies (Switchable)

1. **LRU** (default): Files accessed within 7 days stay on fast tier. Stale files auto-migrate to slow.
2. **Explicit**: User declares tier on upload. No automatic migration.
3. **Tag-based**: Rules match filename patterns (e.g., `*.gguf → slow`, `*.blend → fast`).

All policies share a common base class: `TierPolicy(ABC)`.

---

## Search Layer — Dual Engine

depot-mcp maintains two search indexes in parallel:

### LanceDB (Vector)

- **Model**: `BAAI/bge-small-en-v1.5` (384-dim embeddings via fastembed)
- **Storage**: Disk-based LanceDB table in `data/lancedb/`
- **Query**: `tbl.search(vector).where("tier = 'fast'").limit(20)`
- **Use case**: Semantic search — "find files like this Blender project"

### SQLite FTS5 (Keyword)

- **Tokenization**: Porter stemmer + Unicode61
- **Storage**: Sidecar SQLite DB at `data/depot_fts.db`
- **Ranking**: BM25 scoring
- **Use case**: Exact keyword search — "find markdown files with 'shader pipeline'"

### Hybrid Merge

`SearchService` interleaves results from both engines, deduplicates by `file_id`, normalizes scores, and returns a single ranked list. Three modes: `hybrid`, `semantic`, `keyword`.

---

## Access Surface

### REST API (FastAPI on :10727)

`POST /api/v1/depot/upload`, `GET /api/v1/depot/download/{id}`, `GET /api/v1/depot/search`, ... 8 endpoints.

### MCP Tools (FastMCP SSE on /mcp)

Single portmanteau tool: `depot_management` with 7 actions.

### SMB Share (Windows)

`\\goliath\depot` — exposes the fast tier for direct read-only mounting. Automatic in start.ps1.

---

## LLM Integration

- **Ollama**: Auto-discovered on `localhost:11434` at boot
- **LM Studio**: Auto-discovered on `localhost:1234`
- **Auto-Glom**: `get_llm_manager().glom_local_providers_if_up()` scans for local LLMs
- **Chat API**: `POST /api/llm/chat` with provider routing

---

## Frontend Architecture (Iron Shell)

The dashboard follows the fleet-standard **Iron Shell** layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  AppSidebar (collapsible)  │  Topbar (title + status)            │
│  ┌──────────────────────┐  ├────────────────────────────────────┤
│  │  w-16 / w-56         │  │  Main Content Area                  │
│  │  Nav items + icons   │  │  (scrollable, p-6)                  │
│  │  Collapse toggle     │  │                                     │
│  └──────────────────────┘  │                                     │
│                            │                                     │
└──────────────────────────────────────────────────────────────────┘
```

| Component | File | Description |
| :--- | :--- | :--- |
| **AppSidebar** | `components/layout/AppSidebar.tsx` | Collapsible nav (10 items), toggle button, glassmorphism |
| **Topbar** | `components/layout/Topbar.tsx` | Page title, path breadcrumb, system status (port/version/online) |
| **Layout** | `components/layout/Layout.tsx` | Sidebar + Topbar + Outlet composition |

### Design Constants

- **Dark mode**: `.dark` class on `<html>` (Tailwind `darkMode: "class"`)
- **Glassmorphism**: `.glass`, `.glass-hover`, `.card-glass` utility classes with `backdrop-blur-xl`
- **Z-index**: Sidebar 40, Topbar 40, standard layering
- **Transitions**: `transition-all duration-200` on sidebar expand/collapse and hover states

### Page Set

| Route | Page | Description |
| :--- | :--- | :--- |
| `/` | Dashboard | Storage overview grid, quick actions |
| `/browse` | Browse | File browser grid |
| `/search` | Search | Hybrid/semantic/keyword search |
| `/upload` | Upload | Drag-drop upload with tier selection |
| `/stats` | Stats | Recharts pie charts + storage analytics |
| `/chat` | Chat | Ollama AI chat interface |
| `/tools` | MCP Inspector | Tool surface, features, prompts overview |
| `/help` | Help | Tabbed documentation (6 sections) |
| `/import` | Import | Fleet depot import wizard |
| `/file/:id` | File Detail | Metadata, download, tags, delete |
| `/settings` | Settings | Capabilities introspection |

---

## Capabilities Introspection

`GET /api/capabilities` returns the fleet-standard shape:

```json
{
  "status": "ok",
  "server": { "name": "depot-mcp", "version": "0.1.0", "fastmcp": "3.2.4" },
  "tool_surface": { "total": 1, "portmanteau_count": 1, "portmanteau_tools": ["depot_management"] },
  "features": { "sampling": true, "agentic_workflows": true, "prompts": true, "skills": true, "codemode": true },
  "inventory": { "prompt_names": [...], "skill_uris": [...], "search_modes": [...], "tier_policies": [...] },
  "runtime": { "transport": "sse", "surface_mode": "portmanteau", "frontend_port": 10726, "backend_port": 10727 },
  "llm": { "providers": ["ollama", "lm_studio", "openai"], "auto_glom": true },
  "docs": { "root": "https://github.com/sandraschi/depot-mcp", ... },
  "timestamp": "ISO8601"
}
```
