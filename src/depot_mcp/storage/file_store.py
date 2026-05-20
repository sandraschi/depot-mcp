"""File store re-exports."""

from depot_mcp.storage import FileStore as _FileStore

FileStore = _FileStore
__all__ = ["FileStore"]
