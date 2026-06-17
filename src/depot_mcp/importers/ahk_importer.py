"""Import AHK scriptlets from autohotkey-test depot."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from depot_mcp.importers.base import BaseImporter

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class AHKImporter(BaseImporter):
    """Imports AHK scriptlets from autohotkey-test depot."""

    def source_name(self) -> str:
        return "autohotkey"

    def scan(self) -> list[dict]:
        if not self.source_path.exists():
            return []
        files = []
        scriptlets_dir = self.source_path / "scriptlets"
        if not scriptlets_dir.exists():
            return []
        for ahk_file in scriptlets_dir.rglob("*.ahk"):
            files.append(
                {
                    "path": str(ahk_file),
                    "filename": ahk_file.name,
                    "mime_type": "text/x-autohotkey",
                    "tags": ["scriptlet", "autohotkey"],
                }
            )
        return files
