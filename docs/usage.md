# Usage Guide

This guide covers the main operations: uploading, searching, downloading, and managing files in the depot.

---

## Uploading Files

### Via Dashboard

1. Navigate to **Upload** in the sidebar
2. Drag a file onto the drop zone, or click to browse
3. Select tier: `Auto` (policy-based), `Fast` (NVMe), or `Slow` (HDD)
4. Add comma-separated tags for discoverability
5. Click upload

### Via REST API

```powershell
curl -X POST http://127.0.0.1:10727/api/v1/depot/upload ^
  -F "file=@C:\project\model.blend" ^
  -F "tier=fast" ^
  -F "tags=project-x,3d,blender"
```

### Via MCP Tool

```json
{
  "action": "upload",
  "filename": "model.blend",
  "file_data_b64": "...base64...",
  "tier": "fast",
  "tags": ["project-x", "3d"]
}
```

---

## Searching for Files

Three search modes are available:

| Mode | Engine | Best For |
| :--- | :--- | :--- |
| `hybrid` (default) | LanceDB + FTS5 | General search |
| `semantic` | LanceDB only | "Find files like this one" |
| `keyword` | FTS5 only | Exact filename/content match |

### Via Dashboard

1. Navigate to **Search** in the sidebar
2. Type your query
3. Optionally filter by MIME type, tier, or tags

### Via REST API

```powershell
curl "http://127.0.0.1:10727/api/v1/depot/search?q=blender+cad&tier=fast&limit=10"
```

### Via MCP Tool

```json
{
  "action": "search",
  "query": "blender cad project",
  "mime_type": "application/x-blender",
  "limit": 10,
  "search_mode": "hybrid"
}
```

---

## Managing Files

### View File Details

Click any file in Browse or Search to see:
- Filename, MIME type, size, tier
- Tags (editable)
- Checksum (SHA-256)
- Download and delete actions

### Update Tags

```powershell
curl -X PATCH http://127.0.0.1:10727/api/v1/depot/files/{file_id} ^
  -H "Content-Type: application/json" ^
  -d '{"tags": ["reviewed", "final", "project-x"]}'
```

### Migrate Between Tiers

```powershell
curl -X POST http://127.0.0.1:10727/api/v1/depot/migrate ^
  -H "Content-Type: application/json" ^
  -d '{"file_id": "uuid-here", "target_tier": "slow"}'
```

### Delete a File

```powershell
curl -X DELETE http://127.0.0.1:10727/api/v1/depot/files/{file_id}
```

---

## Storage Statistics

Get real-time usage across both tiers:

```powershell
curl http://127.0.0.1:10727/api/v1/depot/stats
```

Response:
```json
{
  "fast": { "used_gb": 120.5, "free_gb": 380.2, "file_count": 340 },
  "slow": { "used_gb": 2100.0, "free_gb": 800.0, "file_count": 1200 },
  "total_files": 1540,
  "index": { "lancedb_rows": 1540, "fts5_rows": 1540 }
}
```

---

## AI Chat

If Ollama is running on Goliath, the Chat page enables natural-language queries:

- "How much space is used on the fast tier?"
- "Find all Blender files tagged 'project-x'"
- "Show me the largest files on the slow tier"
- "Migrate old CAD files to cold storage"

The AI uses your local Ollama models (auto-discovered) and can answer questions based on the depot's REST API.
