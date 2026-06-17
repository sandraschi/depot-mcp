"""Import DXF/DWG files from qcad-mcp depot."""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

from depot_mcp.importers.base import BaseImporter

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class QCADImporter(BaseImporter):
    """Imports DXF/DWG files from qcad-mcp depot."""

    def source_name(self) -> str:
        return "qcad"

    def scan(self) -> list[dict]:
        if not self.source_path.exists():
            return []
        files = []
        for cad_file in self.source_path.rglob("*"):
            if cad_file.suffix.lower() in (".dxf", ".dwg") and not cad_file.name.endswith(".meta.json"):
                meta_file = cad_file.with_suffix(cad_file.suffix + ".meta.json")
                tags = ["cad"]
                if meta_file.exists():
                    try:
                        meta_data = json.loads(meta_file.read_text())
                        if meta_data.get("layers"):
                            tags.append(f"layers:{len(meta_data['layers'])}")
                    except Exception:
                        pass
                mime_type = "image/vnd.dxf" if cad_file.suffix.lower() == ".dxf" else "application/x-dwg"
                files.append(
                    {
                        "path": str(cad_file),
                        "filename": cad_file.name,
                        "mime_type": mime_type,
                        "tags": tags,
                    }
                )
        return files
