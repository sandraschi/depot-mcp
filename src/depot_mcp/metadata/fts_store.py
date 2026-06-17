"""SQLite FTS5 sidecar for keyword/exact search.

[RATIONALE]: LanceDB vector search excels at semantic matching but is weak at
exact keyword queries. SQLite FTS5 provides BM25-ranked full-text search as a
complementary sidecar, following the arxiv-mcp battle-tested pattern.
"""

from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from depot_mcp.config import DepoConfig

logger = logging.getLogger(__name__)


class FTSStore:
    """SQLite FTS5 sidecar for keyword search."""

    def __init__(self, config: DepoConfig) -> None:
        self.config = config
        self.db_path = Path(config.fts_db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn: sqlite3.Connection | None = None

    async def initialize(self) -> None:
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS depot_fts USING fts5(
                file_id UNINDEXED,
                filename,
                mime_type,
                tags,
                content_preview,
                tokenize='porter unicode61'
            )
        """)
        self.conn.commit()

    def index(self, meta: dict) -> None:
        if not self.conn:
            raise RuntimeError("FTSStore not initialized")
        self.conn.execute(
            "INSERT OR REPLACE INTO depot_fts(file_id, filename, mime_type, tags, content_preview) VALUES (?, ?, ?, ?, ?)",
            (
                meta["id"],
                meta.get("filename", ""),
                meta.get("mime_type", ""),
                " ".join(meta.get("tags", [])),
                meta.get("content_preview", ""),
            ),
        )
        self.conn.commit()

    def search(self, query: str, limit: int = 20) -> list[dict]:
        if not self.conn:
            return []
        safe_query = query.replace('"', '""')
        try:
            cursor = self.conn.execute(
                "SELECT file_id, filename, mime_type, tags, content_preview, rank FROM depot_fts WHERE depot_fts MATCH ? ORDER BY rank LIMIT ?",
                (safe_query, limit),
            )
            rows = cursor.fetchall()
        except sqlite3.OperationalError:
            rows = []
        results = []
        max_rank = max((r[5] for r in rows), default=1)
        for row in rows:
            score = 1.0 - (row[5] / (max_rank * 2.0))
            results.append(
                {
                    "file_id": row[0],
                    "filename": row[1],
                    "mime_type": row[2],
                    "tags": row[3].split(),
                    "content_preview": row[4],
                    "score": max(0.0, min(1.0, score)),
                }
            )
        return results

    def update(self, file_id: str, meta: dict) -> None:
        if not self.conn:
            return
        self.delete(file_id)
        meta["id"] = file_id
        self.index(meta)

    def delete(self, file_id: str) -> None:
        if not self.conn:
            return
        self.conn.execute("DELETE FROM depot_fts WHERE file_id = ?", (file_id,))
        self.conn.commit()

    def stats(self) -> dict:
        if not self.conn:
            return {"row_count": 0}
        cursor = self.conn.execute("SELECT COUNT(*) FROM depot_fts")
        return {"row_count": cursor.fetchone()[0]}
