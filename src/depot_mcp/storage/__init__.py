"""Low-level file CRUD with checksums and chunked I/O."""

from __future__ import annotations

import hashlib
import logging
import shutil
import uuid
from pathlib import Path
from typing import TYPE_CHECKING

from depot_mcp.config import DepoConfig

if TYPE_CHECKING:
    from depot_mcp.metadata.indexer import FileIndexer

logger = logging.getLogger(__name__)

CHUNK_SIZE = 64 * 1024 * 1024  # 64 MB


class FileStore:
    """Manages file storage on disk across fast and slow tiers."""

    def __init__(self, config: DepoConfig) -> None:
        self.config = config
        self.fast_root = config.fast_root
        self.slow_root = config.slow_root
        self.file_indexer: FileIndexer | None = None

    def init_dirs(self) -> None:
        self.fast_root.mkdir(parents=True, exist_ok=True)
        self.slow_root.mkdir(parents=True, exist_ok=True)

    def _tier_path(self, tier: str) -> Path:
        return self.fast_root if tier == "fast" else self.slow_root

    def generate_id(self) -> str:
        return str(uuid.uuid4())

    def store_path(self, file_id: str, tier: str, filename: str) -> Path:
        subdir = file_id[:2]
        path = self._tier_path(tier) / subdir
        path.mkdir(parents=True, exist_ok=True)
        return path / f"{file_id}_{filename}"

    async def save_file(self, file_id: str, tier: str, filename: str, content: bytes) -> Path:
        path = self.store_path(file_id, tier, filename)
        path.write_bytes(content)
        return path

    async def save_file_stream(self, file_id: str, tier: str, filename: str, stream) -> Path:
        path = self.store_path(file_id, tier, filename)
        with open(path, "wb") as f:
            while True:
                chunk = await stream.read(CHUNK_SIZE)
                if not chunk:
                    break
                f.write(chunk)
        return path

    def checksum(self, path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(path, "rb") as f:
            while True:
                chunk = f.read(CHUNK_SIZE)
                if not chunk:
                    break
                sha256.update(chunk)
        return sha256.hexdigest()

    def file_size(self, path: Path) -> int:
        return path.stat().st_size

    def delete(self, file_id: str, tier: str, filename: str) -> bool:
        path = self.store_path(file_id, tier, filename)
        if path.exists():
            path.unlink()
            self._cleanup_empty_parents(path)
            return True
        return False

    def _cleanup_empty_parents(self, path: Path) -> None:
        parent = path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()

    async def move_between_tiers(self, file_id: str, from_tier: str, to_tier: str, filename: str) -> Path | None:
        src = self.store_path(file_id, from_tier, filename)
        if not src.exists():
            return None
        dst = self.store_path(file_id, to_tier, filename)
        shutil.copy2(src, dst)
        if self.checksum(src) == self.checksum(dst):
            src.unlink()
            self._cleanup_empty_parents(src)
            return dst
        dst.unlink()
        return None

    def tier_usage(self, tier: str) -> dict[str, int]:
        root = self._tier_path(tier)
        total_bytes = 0
        file_count = 0
        if root.exists():
            for f in root.rglob("*"):
                if f.is_file():
                    total_bytes += f.stat().st_size
                    file_count += 1
        disk = shutil.disk_usage(root if root.exists() else Path("."))
        return {
            "used_bytes": total_bytes,
            "free_bytes": disk.free,
            "total_bytes": disk.total,
            "file_count": file_count,
        }
