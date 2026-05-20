# MCP Tools

**depot-mcp** exposes a single portmanteau MCP tool with 7 actions, plus native FastMCP 3.2+ prompts and skills.

---

## Tool: `depot_management`

All depot operations go through this one portmanteau tool.

```python
@mcp.tool()
async def depot_management(
    action: Literal["upload", "download", "search", "stats", "migrate", "delete", "tag"],
    file_id: str | None = None,
    filename: str | None = None,
    file_data_b64: str | None = None,
    query: str | None = None,
    tier: Literal["fast", "slow", "auto"] | None = None,
    tags: list[str] | None = None,
    mime_type: str | None = None,
    limit: int = 20,
    search_mode: Literal["hybrid", "semantic", "keyword"] = "hybrid",
    ctx: Context = None,
) -> dict:
```

### Actions

| Action | Parameters | Returns |
| :--- | :--- | :--- |
| `upload` | `filename`, `file_data_b64`, `tier`, `tags` | `{"file_id", "filename", "tier", "size_bytes"}` |
| `download` | `file_id` | `{"content_b64", "filename", "mime_type", "size_bytes"}` |
| `search` | `query`, `mime_type`, `tags`, `limit`, `search_mode` | `{"results", "total", "mode"}` |
| `stats` | (none) | `{"fast", "slow", "index", "drives", "tier_policy"}` |
| `migrate` | `file_id`, `tier` | `{"file_id", "from_tier", "to_tier"}` |
| `delete` | `file_id` | `{"deleted": true}` |
| `tag` | `file_id`, `tags` | `{"file_id", "tags"}` |

### Return Format

All actions return:
```json
{"success": bool, "action": str, "data": dict, "error": str | None}
```

### Usage Examples

```json
// Upload a file
{"action": "upload", "filename": "model.blend", "file_data_b64": "...", "tier": "fast", "tags": ["project-x"]}

// Search
{"action": "search", "query": "blender cad", "mime_type": "application/x-blender", "limit": 10, "search_mode": "hybrid"}

// Get stats
{"action": "stats"}

// Migrate to slow tier
{"action": "migrate", "file_id": "abc-123", "tier": "slow"}
```

---

## Prompts (FastMCP 3.2+)

4 native prompts for agentic workflows:

| Prompt | Description |
| :--- | :--- |
| `depot_overview` | Summary of depot: file count, tier usage, fleet status |
| `search_files` | Search by name, type, or content |
| `storage_report` | Full storage report with tier breakdown |
| `migrate_help` | Tier migration recommendations |

### Usage via Cursor / Claude Desktop

```
> /prompt depot-mcp depot_overview
> /prompt depot-mcp search_files
```

---

## Skills

A `depot-management` skill is registered via `SkillsDirectoryProvider`:

- **Location**: `src/depot_mcp/skills/depot-management.md`
- **Content**: Upload, search, tier management, fleet import, and API patterns
- **Discovery**: Automatically loaded when the MCP server starts

---

## CodeMode (Agentic)

Enable with the `--agentic` flag:

```powershell
uv run depot-mcp --transport sse --port 10727 --agentic
```

This enables:
- **BM25 tool discovery**: Semantic tool matching for the agent
- **Sampling**: LLM-in-the-loop via `ctx.sample()`
- **Memory**: Context-aware session management

---

## Context Injection

The `depot_management` tool accepts an optional `ctx: Context` parameter. FastMCP 3.2+ injects the active sampling context automatically:

```python
async def depot_management(
    ...
    ctx: Context = None,
) -> dict:
    # ctx.sample() for LLM-in-the-loop
    # ctx.info() for progress reporting
```

---

## REST API (Alternative Access)

All MCP tool operations are also available via REST. See the [API reference](usage.md#rest-api) for details.

| MCP Action | REST Endpoint |
| :--- | :--- |
| `upload` | `POST /api/v1/depot/upload` |
| `download` | `GET /api/v1/depot/download/{id}` |
| `search` | `GET /api/v1/depot/search` |
| `stats` | `GET /api/v1/depot/stats` |
| `delete` | `DELETE /api/v1/depot/files/{id}` |
| `migrate` | `POST /api/v1/depot/migrate` |
| `tag` | `PATCH /api/v1/depot/files/{id}` |

---

## Capabilities Endpoint

`GET /api/capabilities` returns the fleet-standard introspection shape:

| Field | Type | Description |
| :--- | :--- | :--- |
| `status` | string | `"ok"` |
| `server` | object | name, version, fastmcp version, runtime, transport |
| `tool_surface` | object | total tool count, portmanteau/atomic breakdown, tool names |
| `features` | object | boolean flags: sampling, agentic_workflows, prompts, skills, codemode |
| `inventory` | object | prompt_names, skill_uris, search_modes, tier_policies, importers |
| `runtime` | object | transport mode, surface_mode, frontend_port, backend_port, mcp_endpoint |
| `llm` | object | providers list, auto_glom flag |
| `docs` | object | links to all documentation files |
| `timestamp` | string | ISO 8601 timestamp |

The Settings page (`/app/settings`) renders this data. The Tools page (`/app/tools`) shows the tool surface and feature flags.
