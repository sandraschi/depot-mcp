"""Re-embed all depot LanceDB rows — use with just rag / just rag-gpu (venv python, not uv run)."""

from __future__ import annotations

import asyncio
import sys


async def main() -> int:
    from depot_mcp.config import DepoConfig
    from depot_mcp.metadata.lance_store import TABLE_NAME, LanceStore
    from depot_mcp.rag.fastembed_gpu import embed_use_gpu, repo_root_from_here

    config = DepoConfig()
    store = LanceStore(config)
    await store.initialize()
    if not store.table or not store.db:
        print("[rag] LanceDB not initialized.", file=sys.stderr)
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

    gpu = embed_use_gpu(repo_root_from_here())
    print(f"[rag] GPU mode: {gpu}")

    store.db.drop_table(TABLE_NAME)
    await store.initialize()

    def progress(done: int, total: int) -> None:
        pct = int(100 * done / total) if total else 0
        print(f"\r[rag:embed] {done}/{total} ({pct}%)", end="", flush=True)

    n = store.index_many(meta_rows, progress_callback=progress)
    print()
    print(f"[rag] Reindexed {n} depot files on {store.embed_device} (batch {store.embed_batch_size}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
