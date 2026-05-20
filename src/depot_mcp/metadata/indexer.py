"""File indexer — extract metadata and index into LanceDB + FTS5."""

from __future__ import annotations

import logging
import mimetypes
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from depot_mcp.config import DepoConfig
    from depot_mcp.metadata.fts_store import FTSStore
    from depot_mcp.metadata.lance_store import LanceStore
    from depot_mcp.storage.file_store import FileStore
    from depot_mcp.storage.tier_manager import TierManager

logger = logging.getLogger(__name__)


class FileIndexer:
    """Extracts metadata from files and indexes into LanceDB + FTS5."""

    def __init__(
        self,
        config: DepoConfig,
        file_store: FileStore,
        tier_manager: TierManager,
        lance_store: LanceStore,
        fts_store: FTSStore,
    ) -> None:
        self.config = config
        self.file_store = file_store
        self.tier_manager = tier_manager
        self.lance = lance_store
        self.fts = fts_store

    def _guess_mime(self, filename: str) -> str:
        mime, _ = mimetypes.guess_type(filename)
        return mime or "application/octet-stream"

    def _extract_preview(self, path: Path, mime_type: str) -> str:
        if mime_type and mime_type.startswith("text/"):
            try:
                return path.read_text(encoding="utf-8")[:512]
            except Exception:
                return ""
        return ""

    async def index_file(
        self,
        file_id: str,
        filename: str,
        storage_path: Path,
        tier: str,
        tags: list[str] | None = None,
        source: str = "upload",
    ) -> dict:
        import time

        mime_type = self._guess_mime(filename)
        size_bytes = self.file_store.file_size(storage_path)
        checksum = self.file_store.checksum(storage_path)
        preview = self._extract_preview(storage_path, mime_type)

        meta = {
            "id": file_id,
            "filename": filename,
            "storage_path": str(storage_path),
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "tier": tier,
            "tags": tags or [],
            "source": source,
            "checksum_sha256": checksum,
            "access_count": 0,
            "last_accessed": time.time(),
            "created_at": time.time(),
            "content_preview": preview,
        }

        self.lance.index(meta)
        self.fts.index(meta)

        logger.info(f"Indexed: {filename} ({mime_type}, {size_bytes} bytes, tier={tier})")
        return meta
