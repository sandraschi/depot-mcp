"""LanceDB vector store for semantic file search."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    import lancedb
    from fastembed import TextEmbedding

    from depot_mcp.config import DepoConfig

logger = logging.getLogger(__name__)

TABLE_NAME = "depot_files"


class LanceStore:
    """LanceDB-backed vector store for depot file metadata."""

    def __init__(self, config: DepoConfig) -> None:
        self.config = config
        self.db_path = Path(config.lancedb_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db: lancedb.DBConnection | None = None
        self.embedder: TextEmbedding | None = None
        self.embed_device: str = "cpu"
        self.embed_batch_size: int = 64
        self.table: object | None = None

    async def initialize(self) -> None:
        import lancedb
        import pyarrow as pa

        from depot_mcp.rag.fastembed_gpu import embed_use_gpu, repo_root_from_here

        schema = pa.schema([
            pa.field("id", pa.string()),
            pa.field("filename", pa.string()),
            pa.field("storage_path", pa.string()),
            pa.field("mime_type", pa.string()),
            pa.field("size_bytes", pa.int64()),
            pa.field("tier", pa.string()),
            pa.field("tags", pa.list_(pa.string())),
            pa.field("source", pa.string()),
            pa.field("checksum_sha256", pa.string()),
            pa.field("access_count", pa.int64()),
            pa.field("last_accessed", pa.float64()),
            pa.field("created_at", pa.float64()),
            pa.field("vector", pa.list_(pa.float32())),
            pa.field("content_preview", pa.string()),
        ])
        self.db = lancedb.connect(str(self.db_path))
        if TABLE_NAME in self.db.table_names():
            self.table = self.db.open_table(TABLE_NAME)
        else:
            self.table = self.db.create_table(TABLE_NAME, schema=schema, mode="create")

        if embed_use_gpu(repo_root_from_here()):
            self._get_embedder()

    def _get_embedder(self):
        if self.embedder is None:
            from depot_mcp.rag.fastembed_gpu import create_text_embedding, repo_root_from_here

            cache = str(self.db_path / "cache")
            self.embedder, self.embed_device, self.embed_batch_size = create_text_embedding(
                self.config.embedding_model,
                cache,
                repo_root=repo_root_from_here(),
            )
            logger.info("[rag] Embed device: %s (batch %s)", self.embed_device, self.embed_batch_size)
        return self.embedder

    def _build_search_text(self, meta: dict) -> str:
        parts = [
            meta.get("filename", ""),
            meta.get("mime_type", ""),
            " ".join(meta.get("tags", [])),
            meta.get("content_preview", ""),
        ]
        return " ".join(filter(None, parts))

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        embedder = self._get_embedder()
        batch = self.embed_batch_size
        out: list[list[float]] = []
        for start in range(0, len(texts), batch):
            chunk = texts[start : start + batch]
            out.extend([emb.tolist() for emb in embedder.embed(chunk)])
        return out

    def _meta_to_row(self, meta: dict, vector: list[float]) -> dict[str, Any]:
        return {
            "id": meta["id"],
            "filename": meta["filename"],
            "storage_path": meta["storage_path"],
            "mime_type": meta["mime_type"],
            "size_bytes": meta["size_bytes"],
            "tier": meta["tier"],
            "tags": meta.get("tags", []),
            "source": meta.get("source", "upload"),
            "checksum_sha256": meta["checksum_sha256"],
            "access_count": meta.get("access_count", 0),
            "last_accessed": meta.get("last_accessed", time.time()),
            "created_at": meta.get("created_at", time.time()),
            "vector": vector,
            "content_preview": meta.get("content_preview", ""),
        }

    def index(self, meta: dict) -> None:
        if not self.table:
            raise RuntimeError("LanceStore not initialized")
        text = self._build_search_text(meta)
        vector = self.embed([text])[0]
        self.table.add([self._meta_to_row(meta, vector)])

    def index_many(
        self,
        metas: list[dict],
        *,
        progress_callback: Callable[[int, int], None] | None = None,
    ) -> int:
        """Embed and add many file rows in GPU-friendly batches."""
        if not self.table:
            raise RuntimeError("LanceStore not initialized")
        if not metas:
            return 0

        texts = [self._build_search_text(m) for m in metas]
        vectors = self.embed(texts)
        rows = [self._meta_to_row(meta, vec) for meta, vec in zip(metas, vectors, strict=True)]

        write_batch = max(self.embed_batch_size, 64)
        total = len(rows)
        for start in range(0, total, write_batch):
            chunk = rows[start : start + write_batch]
            self.table.add(chunk)
            if progress_callback:
                progress_callback(min(start + len(chunk), total), total)

        return total

    def search(self, query: str, where: str | None = None, limit: int = 20) -> list[dict]:
        if not self.table:
            raise RuntimeError("LanceStore not initialized")
        query_vec = self.embed([query])[0]
        sr = self.table.search(query_vec).limit(limit)
        if where:
            sr = sr.where(where)
        results = sr.to_arrow().to_pylist()
        for r in results:
            distance = r.get("_distance", 0.0)
            r["score"] = max(0.0, 1.0 - distance)
        return results

    def update_meta(self, file_id: str, updates: dict) -> None:
        if not self.table or not self.db:
            raise RuntimeError("LanceStore not initialized")
        updates["last_accessed"] = time.time()
        rows = self.table.to_arrow().to_pylist()
        for r in rows:
            if r["id"] == file_id:
                r.update(updates)
        self.db.create_table(TABLE_NAME, data=rows, mode="overwrite")
        self.table = self.db.open_table(TABLE_NAME)

    def delete(self, file_id: str) -> bool:
        if not self.table or not self.db:
            raise RuntimeError("LanceStore not initialized")
        rows = self.table.to_arrow().to_pylist()
        filtered = [r for r in rows if r["id"] != file_id]
        if len(filtered) == len(rows):
            return False
        self.db.create_table(TABLE_NAME, data=filtered, mode="overwrite")
        self.table = self.db.open_table(TABLE_NAME)
        return True

    def list_all(self) -> list[dict]:
        if not self.table:
            return []
        return self.table.to_arrow().to_pylist()

    def stats(self) -> dict:
        if not self.table:
            return {"exists": False, "row_count": 0}
        return {
            "exists": True,
            "row_count": self.table.count_rows(),
            "embed_device": self.embed_device,
            "embed_batch_size": self.embed_batch_size,
        }
