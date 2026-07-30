# Fleet Integration

This guide covers connecting other MCP servers to depot-mcp and importing their existing storage.

---

## Why Centralize?

Before depot-mcp, every fleet server had its own storage:

| Server | Storage Pattern | Issue |
| :--- | :--- | :--- |
| `arxiv-mcp` | SQLite FTS5 + MD files | Silo'd, no cross-server search |
| `qcad-mcp` | DXF files + .meta.json | No vector search, files on local disk |
| `autohotkey-mcp` | .ahk scriptlets dir | No metadata indexing |
| `devices-mcp` | JSONL + SQLite per domain | Fragmented, no tiering |

depot-mcp unifies all of these into a single searchable, tiered, multi-access depot.

---

## Importing Existing Fleet Depots

### Available Importers

| Importer | Source | File Types | Source Path Hint |
| :--- | :--- | :--- | :--- |
| `arxiv` | arxiv-mcp corpus | `.md` | `D:\Dev\repos\arxiv-mcp\data\arxiv_mcp\markdown\` |
| `qcad` | qcad-mcp depot | `.dxf`, `.dwg` | `%LOCALAPPDATA%\qcad-mcp\depot\` |
| `ahk` | autohotkey-test | `.ahk` | `D:\Dev\repos\autohotkey-test\scriptlets\` |
| `generic` | Any directory | `*.*` | User-specified |

### Via Dashboard

1. Navigate to **Import** in the sidebar
2. Select importer type (arxiv, qcad, ahk, generic)
3. Enter the source path
4. Choose dry-run (scan only) or full import
5. Click Start

### Via REST API

```powershell
# Scan only (dry run)
curl -X POST http://127.0.0.1:10727/api/v1/depot/import ^
  -H "Content-Type: application/json" ^
  -d "{\"source\":\"arxiv\",\"source_path\":\"D:\\Dev\\repos\\arxiv-mcp\\data\\arxiv_mcp\\markdown\\\",\"dry_run\":true}"

# Full import
curl -X POST http://127.0.0.1:10727/api/v1/depot/import ^
  -H "Content-Type: application/json" ^
  -d "{\"source\":\"arxiv\",\"source_path\":\"D:\\Dev\\repos\\arxiv-mcp\\data\\arxiv_mcp\\markdown\\\"}"
```

---

## Connecting Other Servers

### Option A: REST API Calls

Any fleet server can access depot-mcp via HTTP:

```python
import httpx


async def upload_to_depot(file_path: str, tags: list[str] = None):
    async with httpx.AsyncClient() as client:
        with open(file_path, "rb") as f:
            resp = await client.post(
                "http://goliath:10727/api/v1/depot/upload",
                files={"file": f},
                data={"tier": "auto", "tags": ",".join(tags or [])},
            )
        return resp.json()
```

### Option B: MCP Tool Calls

If your server has access to depot-mcp's MCP endpoint:

```python
# Via FastMCP client
result = await mcp_client.call_tool(
    "depot_management",
    {
        "action": "search",
        "query": "recent papers",
        "mime_type": "text/markdown",
    },
)
```

### Option C: SMB Mount (Windows, Fast Tier Only)

Mount the fast tier as a network drive for direct read access:

```powershell
net use Z: \\goliath\depot
```

---

## Migration Strategy

depot-mcp supports a **gradual migration** approach:

1. **Phase 1**: Set up depot-mcp on Goliath PC
2. **Phase 2**: Import arxiv-mcp, qcad-mcp, autohotkey-mcp depots
3. **Phase 3**: Point fleet servers to depot-mcp for new files (via REST API)
4. **Phase 4**: Decommission per-server depots once all files are migrated

No server is forced to migrate. depot-mcp complements existing storage until you're ready to switch.

---

## File Type Registry

depot-mcp supports these file types with auto-tier rules:

| Category | Extensions | Auto-Tier |
| :--- | :--- | :--- |
| LLM Models | `.gguf`, `.safetensors`, `.bin`, `.pt`, `.pth` | slow |
| 3D / CAD | `.blend`, `.gltf`, `.glb`, `.obj`, `.stl`, `.dxf`, `.dwg` | fast |
| Images | `.xcf`, `.svg`, `.png`, `.jpg`, `.jpeg` | fast |
| Video | `.mp4`, `.mov`, `.avi`, `.mkv` | slow |
| Documents | `.md`, `.pdf` | fast |
| Splats | `.splat`, `.ply` | slow |
