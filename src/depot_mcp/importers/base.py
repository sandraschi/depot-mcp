"""Abstract base class for fleet depot importers."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from depot_mcp.config import DepoConfig
    from depot_mcp.metadata.indexer import FileIndexer
    from depot_mcp.storage.file_store import FileStore
    from depot_mcp.storage.tier_manager import TierManager

logger = logging.getLogger(__name__)


class BaseImporter(ABC):
    """Base class for importing files from existing fleet depots."""

    def __init__(
        self,
        config: DepoConfig,
        file_store: FileStore,
        tier_manager: TierManager,
        indexer: FileIndexer,
        source_path: str,
    ) -> None:
        self.config = config
        self.file_store = file_store
        self.tier_manager = tier_manager
        self.indexer = indexer
        self.source_path = Path(source_path)

    @abstractmethod
    def source_name(self) -> str:
        """Human-readable source name (e.g. 'arxiv', 'qcad')."""

    @abstractmethod
    def scan(self) -> list[dict]:
        """Scan the source depot and return list of file metadata dicts."""

    async def import_one(self, meta: dict) -> str | None:
        """Import a single file. Returns depot file_id or None."""
        src_path = Path(meta["path"])
        if not src_path.exists():
            logger.warning(f"Source file missing: {src_path}")
            return None

        file_id = self.file_store.generate_id()
        filename = meta.get("filename", src_path.name)
        tier = self.tier_manager.classify(filename, meta.get("mime_type", ""), meta.get("tags"))
        content = src_path.read_bytes()
        storage_path = await self.file_store.save_file(file_id, tier, filename, content)

        await self.indexer.index_file(
            file_id=file_id,
            filename=filename,
            storage_path=storage_path,
            tier=tier,
            tags=meta.get("tags"),
            source=self.source_name(),
        )
        return file_id

    async def import_all(self, dry_run: bool = False) -> dict:
        """Scan and import all files from the source depot."""
        files = self.scan()
        if dry_run:
            return {"source": self.source_name(), "files_found": len(files), "dry_run": True, "imported": 0}

        imported = 0
        errors = 0
        for meta in files:
            try:
                fid = await self.import_one(meta)
                if fid:
                    imported += 1
                else:
                    errors += 1
            except Exception as e:
                logger.error(f"Import failed for {meta.get('filename')}: {e}")
                errors += 1

        return {"source": self.source_name(), "files_found": len(files), "imported": imported, "errors": errors}
