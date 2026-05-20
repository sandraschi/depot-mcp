# Depot Management Skill

This skill provides guidance on managing files in the fleet depot (depot-mcp).

## Overview

depot-mcp is a centralized file storage server with tiered storage (NVMe fast + HDD slow), dual search (LanceDB vector + SQLite FTS5), and multiple access surfaces (REST API, MCP tools, SMB share).

## Common Operations

### Upload Files
- Use `depot_management(action="upload")` or `POST /api/v1/depot/upload`
- Set tier to `fast`, `slow`, or `auto` (policy-based)
- Add comma-separated tags for discoverability

### Search Files
- Use `depot_management(action="search")` or `GET /api/v1/depot/search?q=...`
- Three search modes: `hybrid` (default), `semantic` (vector), `keyword` (FTS5)
- Filter by `mime_type`, `tier`, and `tags`

### Tier Management
- **LRU policy** (default): Auto-migrates cold files to slow tier after 7 days
- **Explicit policy**: User-declared tier, no auto-migration
- **Tag-based policy**: Type-based rules (e.g. *.gguf→slow, *.blend→fast)

### Import from Fleet
- Supports arxiv-mcp, qcad-mcp, autohotkey-mcp, and generic directory import
- Use `POST /api/v1/depot/import` with `source` and `source_path`
