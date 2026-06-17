"""Import OCR results from ocr-mcp's SQLite corpus depot."""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import suppress
from pathlib import Path
from typing import TYPE_CHECKING

from depot_mcp.importers.base import BaseImporter

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class OcrImporter(BaseImporter):
    """Imports OCR-extracted text documents from ocr-mcp corpus depot."""

    def source_name(self) -> str:
        return "ocr"

    def _find_corpus_db(self) -> Path | None:
        """Locate the ocr-mcp corpus.db in standard locations."""
        candidates = [
            self.source_path / "corpus.db",
            Path.home() / ".cache" / "ocr-mcp" / "corpus" / "corpus.db",
            self.source_path / "corpus" / "corpus.db",
            Path(self.source_path).parent / ".cache" / "ocr-mcp" / "corpus" / "corpus.db",
        ]
        for c in candidates:
            if c.exists():
                return c
        return None

    def scan(self) -> list[dict]:
        db_path = self._find_corpus_db()
        if not db_path:
            logger.info("ocr-mcp corpus.db not found at %s", self.source_path)
            return []

        docs: list[dict] = []
        try:
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                "SELECT id, title, source_path, ocr_text, tags, metadata FROM documents ORDER BY id DESC LIMIT 500"
            )
            for row in cursor:
                meta = {}
                if row["metadata"]:
                    with suppress(json.JSONDecodeError, TypeError):
                        meta = json.loads(row["metadata"])
                tags = ["ocr"]
                if row["tags"]:
                    tags.extend(t.split(",") if isinstance(t := row["tags"], str) else [])

                text_content = (row["ocr_text"] or "")[:500]
                docs.append(
                    {
                        "path": str(db_path),
                        "filename": row["title"] or f"ocr_{row['id']}.txt",
                        "mime_type": "text/plain",
                        "tags": tags,
                        "ocr_id": row["id"],
                        "source_path": row["source_path"] or "",
                        "text_preview": text_content,
                        "metadata": meta,
                    }
                )
            conn.close()
            logger.info("ocr-mcp corpus: imported %d documents", len(docs))
        except sqlite3.Error as e:
            logger.error("ocr-mcp corpus read failed: %s", e)

        return docs
