"""Metadata layer: LanceDB vector store, SQLite FTS5, search, and indexing."""

from depot_mcp.metadata.fts_store import FTSStore
from depot_mcp.metadata.indexer import FileIndexer
from depot_mcp.metadata.lance_store import LanceStore
from depot_mcp.metadata.search import SearchService

__all__ = ["LanceStore", "FTSStore", "FileIndexer", "SearchService"]
