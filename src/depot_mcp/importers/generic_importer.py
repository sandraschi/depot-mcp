"""Generic directory importer — imports any file type from a given directory."""

from __future__ import annotations

import logging
import mimetypes
from typing import TYPE_CHECKING

from depot_mcp.importers.base import BaseImporter

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class GenericImporter(BaseImporter):
    """Imports all files recursively from a directory."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._label = self.source_path.name

    def source_name(self) -> str:
        return f"import:{self._label}"

    def scan(self) -> list[dict]:
        if not self.source_path.exists():
            return []
        files = []
        for f in self.source_path.rglob("*"):
            if f.is_file():
                mime, _ = mimetypes.guess_type(f.name)
                files.append({
                    "path": str(f),
                    "filename": f.name,
                    "mime_type": mime or "application/octet-stream",
                    "tags": [self._label],
                })
        return files
