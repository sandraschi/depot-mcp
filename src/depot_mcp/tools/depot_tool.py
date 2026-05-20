"""Portmanteau depot management MCP tool.

[RATIONALE]: Consolidates 7 file operations (upload, download, search, stats,
migrate, delete, tag) into a single portmanteau tool to keep the MCP surface
lean, following the fleet standard pattern established by devices-mcp.
"""

from __future__ import annotations

import base64
import time
from pathlib import Path
from typing import Annotated, Any, Literal

from fastmcp import FastMCP
from pydantic import Field

try:
    from fastmcp import Context
except ImportError:
    from fastmcp.server.context import Context


def register_depot_tool(mcp: FastMCP, server: Any = None) -> None:
    @mcp.tool()
    async def depot_management(
        action: Annotated[
            Literal["upload", "download", "search", "stats", "migrate", "delete", "tag"],
            Field(description="Operation to perform on the depot."),
        ],
        file_id: Annotated[str | None, Field(description="UUID of target file.")] = None,
        filename: Annotated[str | None, Field(description="Original filename for the file.")] = None,
        file_data_b64: Annotated[str | None, Field(description="Base64-encoded file content for upload.")] = None,
        query: Annotated[str | None, Field(description="Search query string.")] = None,
        tier: Annotated[Literal["fast", "slow", "auto"] | None, Field(description="Target tier.")] = None,
        tags: Annotated[list[str] | None, Field(description="Tags to apply or filter by.")] = None,
        mime_type: Annotated[str | None, Field(description="Filter by MIME type.")] = None,
        limit: Annotated[int, Field(description="Max results.", ge=1, le=100)] = 20,
        search_mode: Annotated[Literal["hybrid", "semantic", "keyword"] | None, Field(description="Search mode.")] = "hybrid",
        ctx: Context = None,
    ) -> dict:
        """Centralized fleet depot. Upload, search, download, and manage files across fast (NVMe) and slow (spinner) tiers.

        [RATIONALE]: Consolidates 7 file operations into one portmanteau tool to keep the MCP tool surface lean.

        ## Return Format
        {"success": bool, "action": str, "data": dict, "error": str|None}

        ## Examples
        depot_management(action="upload", filename="model.blend", file_data_b64="...", tier="fast", tags=["project-x"])
        depot_management(action="search", query="cad engine blueprint", mime_type="application/x-blender", limit=10)
        depot_management(action="stats")
        depot_management(action="tag", file_id="abc-123", tags=["reviewed", "final"])
        """
        if server is None:
            return {"success": False, "action": action, "data": {}, "error": "Server not initialized"}

        try:
            if action == "upload":
                return await _handle_upload(server, filename, file_data_b64, tier, tags)
            elif action == "download":
                return await _handle_download(server, file_id)
            elif action == "search":
                return await _handle_search(server, query, mime_type, tags, limit, search_mode)
            elif action == "stats":
                return await _handle_stats(server)
            elif action == "migrate":
                return await _handle_migrate(server, file_id, tier)
            elif action == "delete":
                return await _handle_delete(server, file_id)
            elif action == "tag":
                return await _handle_tag(server, file_id, tags)
            else:
                return {"success": False, "action": action, "data": {}, "error": f"Unknown action: {action}"}
        except Exception as e:
            return {"success": False, "action": action, "data": {}, "error": str(e)}


async def _handle_upload(server, filename: str | None, file_data_b64: str | None, tier: str | None, tags: list[str] | None) -> dict:
    if not filename or not file_data_b64:
        return {"success": False, "action": "upload", "data": {}, "error": "filename and file_data_b64 required"}
    file_id = server.file_store.generate_id()
    content = base64.b64decode(file_data_b64)
    resolved_tier = tier if tier and tier != "auto" else server.tier_manager.classify(filename, "", tags)
    path = await server.file_store.save_file(file_id, resolved_tier, filename, content)
    meta = await server.file_store.file_indexer.index_file(
        file_id=file_id,
        filename=filename,
        storage_path=path,
        tier=resolved_tier,
        tags=tags,
        source="upload",
    )
    return {"success": True, "action": "upload", "data": {"file_id": file_id, "filename": filename, "tier": resolved_tier, "size_bytes": meta["size_bytes"]}}


async def _handle_download(server, file_id: str | None) -> dict:
    if not file_id:
        return {"success": False, "action": "download", "data": {}, "error": "file_id required"}
    all_files = server.lance_store.list_all()
    found = next((f for f in all_files if f["id"] == file_id), None)
    if not found:
        return {"success": False, "action": "download", "data": {}, "error": f"File not found: {file_id}"}
    path = Path(found["storage_path"])
    if not path.exists():
        return {"success": False, "action": "download", "data": {}, "error": "File missing from disk"}
    content = path.read_bytes()
    server.lance_store.update_meta(file_id, {"access_count": found.get("access_count", 0) + 1, "last_accessed": time.time()})
    return {"success": True, "action": "download", "data": {"file_id": file_id, "filename": found["filename"], "mime_type": found["mime_type"], "size_bytes": len(content), "content_b64": base64.b64encode(content).decode()}}


async def _handle_search(server, query: str | None, mime_type: str | None, tags: list[str] | None, limit: int, search_mode: str | None) -> dict:
    if not query:
        return {"success": False, "action": "search", "data": {}, "error": "query required"}
    where_clauses = []
    if mime_type:
        safe_mime = mime_type.replace("'", "''")
        where_clauses.append(f"mime_type = '{safe_mime}'")
    if tags:
        tag_filters = " OR ".join(f"tags LIKE '%{t.replace("'", "''")}%'" for t in tags)
        where_clauses.append(f"({tag_filters})")
    where = " AND ".join(where_clauses) if where_clauses else None
    result = server.search_service.search(query=query, where=where, limit=limit, mode=search_mode or "hybrid")
    return {"success": True, "action": "search", "data": result}


async def _handle_stats(server) -> dict:
    fast = server.file_store.tier_usage("fast")
    slow = server.file_store.tier_usage("slow")
    lance = server.lance_store.stats()
    fts = server.fts_store.stats()
    drives = server.config.drives
    return {
        "success": True,
        "action": "stats",
        "data": {
            "fast": {"used_gb": round(fast["used_bytes"] / 1e9, 2), "free_gb": round(fast["free_bytes"] / 1e9, 2), "file_count": fast["file_count"]},
            "slow": {"used_gb": round(slow["used_bytes"] / 1e9, 2), "free_gb": round(slow["free_bytes"] / 1e9, 2), "file_count": slow["file_count"]},
            "index": {"lancedb_rows": lance.get("row_count", 0), "fts5_rows": fts.get("row_count", 0)},
            "drives": drives,
            "tier_policy": server.config.tier_policy,
        },
    }


async def _handle_migrate(server, file_id: str | None, tier: str | None) -> dict:
    if not file_id or not tier:
        return {"success": False, "action": "migrate", "data": {}, "error": "file_id and tier required"}
    all_files = server.lance_store.list_all()
    found = next((f for f in all_files if f["id"] == file_id), None)
    if not found:
        return {"success": False, "action": "migrate", "data": {}, "error": f"File not found: {file_id}"}
    if found["tier"] == tier:
        return {"success": True, "action": "migrate", "data": {"message": "Already on target tier", "file_id": file_id, "tier": tier}}
    result = await server.tier_manager.migrate(file_id, found["tier"], tier, found["filename"])
    if result["success"]:
        server.lance_store.update_meta(file_id, {"tier": tier, "storage_path": result["new_path"]})
    return {"success": result["success"], "action": "migrate", "data": result, "error": result.get("error")}


async def _handle_delete(server, file_id: str | None) -> dict:
    if not file_id:
        return {"success": False, "action": "delete", "data": {}, "error": "file_id required"}
    all_files = server.lance_store.list_all()
    found = next((f for f in all_files if f["id"] == file_id), None)
    if not found:
        return {"success": False, "action": "delete", "data": {}, "error": f"File not found: {file_id}"}
    server.file_store.delete(file_id, found["tier"], found["filename"])
    server.lance_store.delete(file_id)
    server.fts_store.delete(file_id)
    return {"success": True, "action": "delete", "data": {"file_id": file_id, "deleted": True}}


async def _handle_tag(server, file_id: str | None, tags: list[str] | None) -> dict:
    if not file_id:
        return {"success": False, "action": "tag", "data": {}, "error": "file_id required"}
    server.lance_store.update_meta(file_id, {"tags": tags or []})
    server.fts_store.update(file_id, {"tags": tags or []})
    return {"success": True, "action": "tag", "data": {"file_id": file_id, "tags": tags}}
