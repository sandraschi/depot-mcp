"""Chunked upload handler for large files."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from depot_mcp.config import DepoConfig

logger = logging.getLogger(__name__)


class ChunkedUpload:
    """Handles large file uploads in chunks with resume capability."""

    def __init__(self, config: DepoConfig) -> None:
        self.config = config
        self.chunk_size = config.chunk_size_mb * 1024 * 1024

    async def receive(self, stream, file_id: str, tier: str, filename: str, target_dir: Path) -> Path:
        path = target_dir / f"{file_id}_{filename}"
        sha256 = hashlib.sha256()
        with open(path, "wb") as f:
            while True:
                chunk = await stream.read(self.chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                sha256.update(chunk)
        return path

    async def resume_info(self, file_id: str, tier: str, filename: str, target_dir: Path) -> int | None:
        path = target_dir / f"{file_id}_{filename}.partial"
        if path.exists():
            return path.stat().st_size
        return None
