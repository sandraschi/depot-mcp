"""Import files from arxiv-mcp FTS5 corpus depot."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from depot_mcp.importers.base import BaseImporter

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class ArxivImporter(BaseImporter):
    """Imports markdown papers from arxiv-mcp corpus depot."""

    def source_name(self) -> str:
        return "arxiv"

    def scan(self) -> list[dict]:
        if not self.source_path.exists():
            return []
        files = []
        for md_file in self.source_path.rglob("*.md"):
            files.append({
                "path": str(md_file),
                "filename": md_file.name,
                "mime_type": "text/markdown",
                "tags": ["paper", "arxiv"],
            })
        return files
