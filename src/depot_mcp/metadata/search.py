"""Unified search service merging LanceDB vector + SQLite FTS5 results."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from depot_mcp.config import DepoConfig
    from depot_mcp.metadata.fts_store import FTSStore
    from depot_mcp.metadata.lance_store import LanceStore

logger = logging.getLogger(__name__)


class SearchService:
    """Merges results from LanceDB (semantic) and FTS5 (keyword) into ranked list."""

    def __init__(self, config: DepoConfig, lance_store: LanceStore, fts_store: FTSStore) -> None:
        self.config = config
        self.lance = lance_store
        self.fts = fts_store

    def search(
        self,
        query: str,
        where: str | None = None,
        limit: int = 20,
        mode: str = "hybrid",
    ) -> dict:
        if mode == "semantic":
            results = self._lance_search(query, where, limit)
            return {"results": results, "total": len(results), "mode": "semantic"}
        elif mode == "keyword":
            results = self._fts_search(query, limit)
            return {"results": results, "total": len(results), "mode": "keyword"}
        else:
            results = self._hybrid_search(query, where, limit)
            return {"results": results, "total": len(results), "mode": "hybrid"}

    def _lance_search(self, query: str, where: str | None, limit: int) -> list[dict]:
        try:
            rows = self.lance.search(query, where=where, limit=limit)
        except Exception as e:
            logger.warning(f"LanceDB search failed: {e}")
            return []
        result = []
        for r in rows:
            result.append(
                {
                    "file_id": r["id"],
                    "filename": r.get("filename", ""),
                    "mime_type": r.get("mime_type", ""),
                    "size_bytes": r.get("size_bytes", 0),
                    "tier": r.get("tier", ""),
                    "tags": r.get("tags", []),
                    "score": r.get("score", 0.0),
                    "source": "vector",
                }
            )
        return result

    def _fts_search(self, query: str, limit: int) -> list[dict]:
        rows = self.fts.search(query, limit=limit)
        for r in rows:
            r["size_bytes"] = 0
            r["tier"] = ""
            r["source"] = "fts5"
        return rows

    def _hybrid_search(self, query: str, where: str | None, limit: int) -> list[dict]:
        vector_results = self._lance_search(query, where, limit)
        fts_results = self._fts_search(query, limit)

        seen: set[str] = set()
        merged: list[dict] = []
        vi, fi = 0, 0
        while len(merged) < limit and (vi < len(vector_results) or fi < len(fts_results)):
            v_score = vector_results[vi]["score"] if vi < len(vector_results) else -1
            f_score = fts_results[fi]["score"] if fi < len(fts_results) else -1
            if v_score >= f_score and vi < len(vector_results):
                r = vector_results[vi]
                vi += 1
            elif fi < len(fts_results):
                r = fts_results[fi]
                fi += 1
            else:
                break
            fid = r.get("file_id", "")
            if fid not in seen:
                seen.add(fid)
                r["rank"] = len(merged) + 1
                merged.append(r)
        return merged
