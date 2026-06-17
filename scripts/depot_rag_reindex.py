"""Re-embed all depot LanceDB rows — use with just rag-gpu (venv python, not uv run)."""

from __future__ import annotations

import asyncio

from depot_mcp.config import DepoConfig
from depot_mcp.metadata.lance_store import TABLE_NAME, LanceStore


async def main() -> int:
    config = DepoConfig()
    store = LanceStore(config)
    await store.initialize()
    if not store.table or not store.db:
        print("[rag] LanceDB not initialized.")
        return 1

    rows = store.table.to_arrow().to_pylist()
    if not rows:
        print("[rag] No rows to reindex.")
        return 0

    meta_rows = []
    for row in rows:
        meta_rows.append(
            {
                "id": row["id"],
                "filename": row["filename"],
                "storage_path": row["storage_path"],
                "mime_type": row["mime_type"],
                "size_bytes": row["size_bytes"],
                "tier": row["tier"],
                "tags": row.get("tags") or [],
                "source": row.get("source", "upload"),
                "checksum_sha256": row["checksum_sha256"],
                "access_count": row.get("access_count", 0),
                "last_accessed": row.get("last_accessed", 0),
                "created_at": row.get("created_at", 0),
                "content_preview": row.get("content_preview", ""),
            }
        )

    store.db.drop_table(TABLE_NAME)
    await store.initialize()
    for meta in meta_rows:
        store.index(meta)

    print(f"[rag] Reindexed {len(meta_rows)} depot files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
