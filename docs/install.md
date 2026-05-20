# Installation Guide

This guide walks you through setting up **depot-mcp** on Goliath PC.

## Prerequisites

- **Python 3.12+**: The core server is written in Python.
- **uv**: We recommend [uv](https://docs.astral.sh/uv/) for dependency management.
- **Node.js (LTS)**: Required for the web dashboard (Vite + React).
- **Git**: To clone the repository.
- **Windows**: The SMB share feature uses `New-SmbShare` (PowerShell admin).

---

## Step-by-Step Setup

### 1. Clone the Repository

```powershell
git clone https://github.com/sandraschi/depot-mcp.git
cd depot-mcp
```

### 2. Python Environment

```powershell
uv sync
```

This installs all core dependencies (FastAPI, FastMCP, LanceDB, fastembed, httpx, etc.).

### 3. Frontend Dependencies

```powershell
cd web_sota\frontend
npm install
cd ..\..
```

### 4. Storage Directories

Create the depot root directories (can be overridden via env vars):

```powershell
New-Item -ItemType Directory -Path D:\depot\fast -Force
New-Item -ItemType Directory -Path E:\depot\slow -Force
```

---

## Running Modes

### A. Full Stack (Recommended)

Starts backend (port 10727), frontend (port 10726), and SMB share. The frontend runs in the background — once ready, the browser auto-opens to the dashboard:

```powershell
.\web_sota\start.bat
```

### B. MCP Server Only (Stdio)

Use this mode to integrate with Cursor, Claude Desktop, or other MCP clients:

```powershell
uv run depot-mcp --transport stdio
```

### C. MCP Server (SSE + REST)

```powershell
uv run depot-mcp --transport sse --port 10727
```

### D. Agentic Mode

Enables CodeMode BM25 transforms and sampling:

```powershell
uv run depot-mcp --transport sse --port 10727 --agentic
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DEPOT_FAST_ROOT` | `D:\depot\fast` | Fast tier (NVMe) root directory |
| `DEPOT_SLOW_ROOT` | `E:\depot\slow` | Slow tier (HDD) root directory |
| `DEPOT_TIER_POLICY` | `lru` | Tier policy: `lru`, `explicit`, `tag_based` |
| `DEPOT_LRU_TTL_DAYS` | `7` | Days before LRU marks a file as cold |
| `DEPOT_MCP_LLM_GLOM` | `1` | Auto-detect Ollama/LM Studio on boot |

### Drive Discovery

depot-mcp auto-scans available drives on boot:
- **Fast tier**: `C:`, `D:`, `N:` (NVMe/SSD)
- **Slow tier**: All other fixed drives (HDD spinners)

---

## Verifying the Setup

```powershell
# Check health
curl http://127.0.0.1:10727/api/capabilities

# Check stats
curl http://127.0.0.1:10727/api/v1/depot/stats
```

Expected response from capabilities:
```json
{
  "service": "depot-mcp",
  "version": "0.1.0",
  "endpoints": { "mcp": "/mcp", "api": "/api/v1", "llm": "/api/llm" }
}
```
