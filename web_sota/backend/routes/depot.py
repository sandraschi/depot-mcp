from depot_mcp.server import DepoMCPServer


def create_router(server: DepoMCPServer):
    import time
    from io import BytesIO
    from pathlib import Path

    from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
    from fastapi.responses import StreamingResponse

    router = APIRouter(tags=["depot"])

    @router.post("/depot/upload")
    async def upload(
        file: UploadFile = File(...),  # noqa: B008
        tier: str = Form(default="auto"),
        tags: str = Form(default=""),
        policy: str = Form(default=""),
    ):
        if not file.filename:
            raise HTTPException(400, "filename required")
        file_id = server.file_store.generate_id()
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        resolved_tier = tier if tier not in ("auto", "") else server.tier_manager.classify(
            file.filename, file.content_type or "", tag_list
        )
        path = await server.file_store.save_file_stream(file_id, resolved_tier, file.filename, file.file)
        meta = await server.file_store.file_indexer.index_file(
            file_id=file_id,
            filename=file.filename,
            storage_path=path,
            tier=resolved_tier,
            tags=tag_list,
            source="upload",
        )
        return {"success": True, "file_id": file_id, "filename": file.filename, "tier": resolved_tier, "size_bytes": meta["size_bytes"]}

    @router.get("/depot/download/{file_id}")
    async def download(file_id: str):
        all_files = server.lance_store.list_all()
        found = next((f for f in all_files if f["id"] == file_id), None)
        if not found:
            raise HTTPException(404, "File not found")
        path = Path(found["storage_path"])
        if not path.exists():
            raise HTTPException(404, "File missing from disk")
        server.lance_store.update_meta(file_id, {"access_count": found.get("access_count", 0) + 1, "last_accessed": time.time()})
        return StreamingResponse(
            BytesIO(path.read_bytes()),
            media_type=found.get("mime_type", "application/octet-stream"),
            headers={"Content-Disposition": f'attachment; filename="{found["filename"]}"'},
        )

    @router.get("/depot/search")
    async def search(
        q: str = Query(default=""),
        tier: str = Query(default=""),
        mime: str = Query(default=""),
        tags: str = Query(default=""),
        limit: int = Query(default=20, ge=1, le=100),
        mode: str = Query(default="hybrid"),
    ):
        if not q:
            return {"results": [], "total": 0, "mode": mode}
        where_clauses = []
        if tier:
            where_clauses.append(f"tier = '{tier}'")
        if mime:
            where_clauses.append(f"mime_type = '{mime}'")
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        if tag_list:
            tag_filters = " OR ".join(f"tags LIKE '%{t}%'" for t in tag_list)
            where_clauses.append(f"({tag_filters})")
        where = " AND ".join(where_clauses) if where_clauses else None
        return server.search_service.search(query=q, where=where, limit=limit, mode=mode)

    @router.get("/depot/stats")
    async def stats():
        fast = server.file_store.tier_usage("fast")
        slow = server.file_store.tier_usage("slow")
        lance = server.lance_store.stats()
        fts = server.fts_store.stats()
        return {
            "fast": {"used_gb": round(fast["used_bytes"] / 1e9, 2), "free_gb": round(fast["free_bytes"] / 1e9, 2), "file_count": fast["file_count"]},
            "slow": {"used_gb": round(slow["used_bytes"] / 1e9, 2), "free_gb": round(slow["free_bytes"] / 1e9, 2), "file_count": slow["file_count"]},
            "total_files": fast["file_count"] + slow["file_count"],
            "index": {"lancedb_rows": lance.get("row_count", 0), "fts5_rows": fts.get("row_count", 0)},
        }

    @router.delete("/depot/files/{file_id}")
    async def delete_file(file_id: str):
        all_files = server.lance_store.list_all()
        found = next((f for f in all_files if f["id"] == file_id), None)
        if not found:
            raise HTTPException(404, "File not found")
        server.file_store.delete(file_id, found["tier"], found["filename"])
        server.lance_store.delete(file_id)
        server.fts_store.delete(file_id)
        return {"deleted": True, "file_id": file_id}

    @router.patch("/depot/files/{file_id}")
    async def update_file(file_id: str, tags: list[str] | None = None, tier: str | None = None):
        all_files = server.lance_store.list_all()
        found = next((f for f in all_files if f["id"] == file_id), None)
        if not found:
            raise HTTPException(404, "File not found")
        updates = {}
        if tags is not None:
            updates["tags"] = tags
        if tier is not None:
            updates["tier"] = tier
        if updates:
            server.lance_store.update_meta(file_id, updates)
        return {"file_id": file_id, "updated": True}

    @router.post("/depot/migrate")
    async def migrate(file_id: str, target_tier: str):
        all_files = server.lance_store.list_all()
        found = next((f for f in all_files if f["id"] == file_id), None)
        if not found:
            raise HTTPException(404, "File not found")
        if found["tier"] == target_tier:
            return {"file_id": file_id, "tier": target_tier, "message": "Already on target tier"}
        result = await server.tier_manager.migrate(file_id, found["tier"], target_tier, found["filename"])
        if result["success"]:
            server.lance_store.update_meta(file_id, {"tier": target_tier, "storage_path": result["new_path"]})
        return result

    @router.post("/depot/import")
    async def import_depot(source: str, source_path: str, dry_run: bool = False):
        from depot_mcp.importers.ahk_importer import AHKImporter
        from depot_mcp.importers.arxiv_importer import ArxivImporter
        from depot_mcp.importers.generic_importer import GenericImporter
        from depot_mcp.importers.qcad_importer import QCADImporter

        importers = {
            "arxiv": ArxivImporter,
            "qcad": QCADImporter,
            "ahk": AHKImporter,
            "generic": GenericImporter,
        }
        importer_cls = importers.get(source)
        if not importer_cls:
            raise HTTPException(400, f"Unknown source: {source}. Available: {list(importers)}")
        importer = importer_cls(server.config, server.file_store, server.tier_manager, server.file_store.file_indexer, source_path)
        return await importer.import_all(dry_run=dry_run)

    return router
