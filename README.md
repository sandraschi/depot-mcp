# depot-mcp

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
</p>

**Centralized fleet file depot — tiered NVMe/spinner storage with LanceDB vector search and SQLite FTS5 sidecar.**

Every MCP server in the fleet has its own ad-hoc depot. depot-mcp unifies them on Goliath PC: one permanent server, one URL, one search engine, two storage tiers.

---

## Why depot-mcp?

1. **Tiered Storage**: Hot files live on NVMe (C:/D:/N:). Cold files migrate to HDD spinners automatically. No more guessing which drive.
2. **Dual Search**: LanceDB finds semantically similar files; SQLite FTS5 finds exact keyword matches — both in one query.
3. **Fleet Native**: Every server (arxiv, qcad, autohotkey, blender, gimp) gets a centralized home. Import existing depots with a single API call.
4. **Multiple Access Patterns**: REST API for scripts, MCP tools for agents, SMB share for direct filesystem mounting.

---

## Documentation Index

| Guide | Content |
| :--- | :--- |
| 🚀 **[Installation](docs/install.md)** | Getting up and running on Goliath PC. |
| 🏗️ **[Architecture](docs/architecture.md)** | Storage tiers, search engines, and component layout. |
| 🛠️ **[Usage](docs/usage.md)** | Uploading, searching, and managing files. |
| 🤖 **[MCP Tools](docs/mcp-tools.md)** | Complete tool, prompt, and skill manifest. |
| 🔗 **[Fleet Integration](docs/fleet.md)** | Connecting other MCP servers and importing depots. |

---

## Quick Start

```powershell
git clone https://github.com/sandraschi/depot-mcp
cd depot-mcp
just
```

This opens an interactive dashboard showing all available commands. Run `just bootstrap` to install dependencies, then `just serve` or `just dev` to start.

### Manual Setup

If you don't have `just` installed:
Requires [Python 3.12+](https://python.org), [uv](https://docs.astral.sh/uv/), and [Node.js](https://nodejs.org) (for the dashboard).
git clone https://github.com/sandraschi/depot-mcp.git
cd depot-mcp
.\web_sota\start.bat
Opens the dashboard at **http://127.0.0.1:10726**.

## What can you do?

- **Browse**: *"Show me all Blender files in the fast tier."*
- **Search**: *"Find CAD drawings related to the printer project."*
- **Upload**: Drop a 10GB LLM model — chunked upload handles it automatically.
- **Manage**: *"Migrate everything older than 30 days to the slow tier."*
- **Analyze**: *"How much space is left on the NVMe drives?"*

---

## Industrial Quality Stack

- **Python (Core)**: Ruff linting, Pydantic v2, FastMCP 3.2+, 0 `print` tolerance.
- **Webapp (UI)**: Biome linting, Tailwind CSS, Lucide icons, Recharts.
- **Search**: LanceDB (vector) + SQLite FTS5 (keyword) with hybrid result merging.
- **Automation**: [Justfile](./justfile) for all fleet operations (`just lint`, `just run`, `just pack`).
- **Security**: Automated audits via `bandit` and `safety`.

## License

MIT — see [LICENSE](LICENSE).
