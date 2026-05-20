# Documentation

Welcome to the **depot-mcp** documentation. This is the central file depot for the fleet — tiered storage, dual search, fleet import.

---

## Guides

| Guide | Description |
| :--- | :--- |
| 🚀 **[Installation](install.md)** | Prerequisites, setup, and running modes. |
| 🏗️ **[Architecture](architecture.md)** | Storage tiers, search engines, component layout, data flow. |
| 🛠️ **[Usage](usage.md)** | Uploading, downloading, searching, migrating files. |
| 🤖 **[MCP Tools](mcp-tools.md)** | Complete manifest of tools, prompts, skills, and CodeMode. |
| 🔗 **[Fleet Integration](fleet.md)** | Importing from arxiv, qcad, autohotkey; connecting other servers. |

---

## Quick Links

| Item | Location |
| :--- | :--- |
| **Dashboard** | `http://127.0.0.1:10726` |
| **API Root** | `http://127.0.0.1:10727/api/v1` |
| **MCP Endpoint** | `http://127.0.0.1:10727/mcp` (SSE) |
| **Capabilities** | `http://127.0.0.1:10727/api/capabilities` |
| **SMB Share** | `\\goliath\depot` (fast tier) |

## Repository Structure

```
depot-mcp/
├── src/depot_mcp/        # Python package
│   ├── server.py         # FastMCP + FastAPI gateway
│   ├── config.py         # Drive discovery + config
│   ├── storage/          # FileStore, TierManager, policies
│   ├── metadata/         # LanceDB, FTS5, SearchService
│   ├── tools/            # Portmanteau MCP tool
│   ├── importers/        # Fleet depot importers
│   ├── llm/              # Ollama/LM Studio providers
│   ├── prompts.py        # FastMCP prompts
│   └── skills/           # Skills directory
├── web_sota/             # Web dashboard (Iron Shell layout)
│   ├── backend/          # FastAPI routes + /api/capabilities
│   └── frontend/         # Vite + React SPA (11 pages)
│       ├── components/layout/
│       │   ├── Layout.tsx       # Sidebar + Topbar + Outlet
│       │   ├── AppSidebar.tsx   # Collapsible nav (w-16/w-56)
│       │   └── Topbar.tsx       # Title, breadcrumbs, status
│       └── pages/               # Dashboard, Browse, Search,
│                                 # Upload, Stats, Chat, Tools,
│                                 # Help, Import, FileDetail, Settings
├── justfile              # Fleet task runner
├── mcpb.json             # MCPB packaging config
└── pyproject.toml        # Python project config
```
