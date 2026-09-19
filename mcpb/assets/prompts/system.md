# schip-mcp-depot — MCP Server Capabilities

## Server Overview

Depot MCP is a centralized fleet file depot with tiered storage (NVMe fast tier + HDD slow tier), auto-drive-discovery, LanceDB vector search, SQLite FTS5 sidecar indexing, and an intelligent tier management policy (LRU, explicit, or tag-based). It runs as a unified FastMCP 3.2 + FastAPI gateway on port 10727 (backend) with a Vite React SOTA dashboard on port 10726. The server supports three transport modes (stdio, http, sse) and an optional agentic mode with CodeMode BM25 discovery.

The depot provides 3 primary entry points: the main server (DepoMCPServer singleton with FastMCP + FastAPI), a plugin entry point for embedding in other FastMCP instances, and a CLI via __main__.py. It supports file upload, download, search (vector, FTS, hybrid), tag management, cross-tier migration, statistical reporting, and LLM-powered semantic operations via a local LLM manager that auto-discovers Ollama and LM Studio instances.

The server uses a DepoConfig Pydantic-settings model with env prefix DEPOT_. Storage tier roots default to D:\depot\fast and E:\depot\slow, but are auto-discovered from environment variables. The file store supports chunked uploads (64MB default chunks, up to 100GB max file size). The file indexer monitors files and maintains both vector and FTS indexes. The SearchService supports hybrid search (reciprocal-rank fusion of FTS BM25 + LanceDB vector similarity). Configuration persists via .env or YAML.

## Tools

### depot_management
**Purpose**: Centralized portmanteau tool for all depot operations — upload, download, search, stats, migrate, delete, tag, and LLM-powered semantic operations.
**Parameters**:
- operation (str, required): One of "upload", "download", "search", "stats", "migrate", "delete", "tag".
- Additional params vary by operation. See individual tool documentation below.

### upload
**Purpose**: Upload a file to the depot. Files are stored in the fast tier by default. Supports chunked uploads for large files.
**Parameters**:
- file_path (str, required): Local path to the file to upload.
- preserve_path (bool, default=True): Preserve the directory structure relative to the source.
- tags (list[str], optional): Tags to attach to the uploaded file.
- tier (str, default="fast"): Storage tier: "fast" (NVMe) or "slow" (HDD).
**Return Format**: {"success": bool, "file_path": str, "tier": str, "size_bytes": int, "message": str}
**Examples**:
- depot_management(operation="upload", file_path="C:/data/report.pdf")
- depot_management(operation="upload", file_path="D:/photos/vacation.jpg", tags=["photo", "vacation"], tier="slow")

### download
**Purpose**: Download a file from the depot to a local path. Resolves from any tier.
**Parameters**:
- depot_path (str, required): Relative path within the depot.
- output_path (str, required): Local destination path.
**Return Format**: {"success": bool, "depot_path": str, "output_path": str, "size_bytes": int}
**Examples**:
- depot_management(operation="download", depot_path="reports/2026/Q1/summary.pdf", output_path="C:/Downloads/summary.pdf")

### search
**Purpose**: Search the depot for files by name, type, content, or tags. Supports FTS, vector (semantic), and hybrid search modes.
**Parameters**:
- query (str, required): Search query string. For FTS, supports standard FTS5 syntax (AND, OR, NOT, prefix*). For vector search, natural language queries.
- limit (int, default=20): Maximum results to return.
- mode (str, default="hybrid"): Search mode: "fts", "semantic", or "hybrid" (reciprocal-rank fusion).
- file_type (str, optional): Filter by file extension (e.g., "pdf", "txt", "py").
- tags (list[str], optional): Filter by tags (AND logic).
- max_age_days (int, optional): Only return files younger than N days.
**Return Format**: {"success": bool, "results": list, "total": int, "mode": str}
**Examples**:
- depot_management(operation="search", query="financial report")
- depot_management(operation="search", query="API documentation", mode="semantic", limit=10)
- depot_management(operation="search", query="*.py", mode="fts", tags=["python"])

### stats
**Purpose**: Return depot storage statistics: tier usage, file counts, total size, file type distribution, and drive availability.
**Parameters**: None.
**Return Format**: {"success": bool, "fast_tier": {"files": int, "size_gb": float}, "slow_tier": {...}, "total": {...}, "drives": {"fast": list, "slow": list}}
**Examples**:
- depot_management(operation="stats")

### migrate
**Purpose**: Migrate a file between storage tiers (fast ↔ slow). Used for tier management (hot/cold data movement).
**Parameters**:
- depot_path (str, required): Relative path of the file to migrate.
- target_tier (str, required): "fast" or "slow".
**Return Format**: {"success": bool, "depot_path": str, "from_tier": str, "to_tier": str, "size_bytes": int}
**Examples**:
- depot_management(operation="migrate", depot_path="old_project/data.db", target_tier="slow")
- depot_management(operation="migrate", depot_path="frequent_access/config.json", target_tier="fast")

### delete
**Purpose**: Delete a file from the depot. Removes from all indexes and tiers.
**Parameters**:
- depot_path (str, required): Relative path of the file to delete.
**Return Format**: {"success": bool, "depot_path": str, "message": str}
**Examples**:
- depot_management(operation="delete", depot_path="temp/cache.tmp")

### tag
**Purpose**: Add, remove, list, or search by tags on depot files.
**Parameters**:
- action (str, required): "add", "remove", "list", or "search".
- depot_path (str, optional): Required for "add" and "remove".
- tags (list[str], optional): Tags to add or remove.
- query (str, optional): Tag query for "search" action.
**Return Format**: {"success": bool, "action": str, "tags": list|dict}
**Examples**:
- depot_management(operation="tag", action="add", depot_path="report.pdf", tags=["finance", "2026"])
- depot_management(operation="tag", action="remove", depot_path="old.txt", tags=["temp"])

## FastMCP 3.2 Features

### Native Prompts (4 registered)
1. **depot_overview**: "Give me an overview of the fleet depot: file count, tier usage, and connected servers."
2. **search_files**: "Search the fleet depot for a specific file. Include filename patterns, file types, or tags."
3. **storage_report**: "Generate a storage report for the depot. Show fast vs slow tier usage, file type distribution, and migration recommendations."
4. **migrate_help**: "I need help managing storage tiers. Show me which files are candidates for migration between fast (NVMe) and slow (HDD) tiers."

### SkillsProvider
When a skills/ directory exists, the server registers a SkillsDirectoryProvider for skill discovery via skill:// URIs.

### CodeMode (Agentic Only)
When --agentic flag is used, the server enables CodeMode BM25 discovery transforms for enhanced agentic workflow support.

## Configuration

### Environment Variables (prefix DEPOT_)
- DEPOT_FAST_ROOT (str, default="D:\\depot\\fast"): Root directory for fast-tier (NVMe) storage.
- DEPOT_SLOW_ROOT (str, default="E:\\depot\\slow"): Root directory for slow-tier (HDD) storage.
- DEPOT_LANCEDB_PATH (str, default="data/lancedb"): Path to LanceDB vector database.
- DEPOT_FTS_DB_PATH (str, default="data/depot_fts.db"): Path to SQLite FTS5 sidecar database.
- DEPOT_DATA_DIR (str, default="data"): Data directory for depot files.
- DEPOT_TIER_POLICY (str, default="lru"): Active tiering policy (lru, explicit, tag_based).
- DEPOT_LRU_TTL_DAYS (int, default=7): Days before LRU eviction considers a file cold.
- DEPOT_CHUNK_SIZE_MB (int, default=64, max=1024): Chunk size for large file uploads.
- DEPOT_MAX_UPLOAD_SIZE_GB (int, default=100, min=1): Maximum allowed upload size.
- DEPOT_HOST (str, default="127.0.0.1"): Server bind host.
- DEPOT_PORT (int, default=10727): Server bind port.
- DEPOT_EMBEDDING_MODEL (str, default="BAAI/bge-small-en-v1.5"): fastembed model for vector embeddings.
- DEPOT_EMBEDDING_DIM (int, default=384): Embedding vector dimension.

### CLI Arguments
- --transport (stdio|http|sse, default=stdio): Transport mode.
- --port (int, default=10727): HTTP/SSE port.
- --host (str, default="127.0.0.1"): Bind host.
- --agentic: Enable CodeMode BM25 agentic transforms.
- --debug: Enable debug logging.

## Data Sources

### Storage Tiers
- **Fast tier** (NVMe): Default location for new uploads. Configured via DEPOT_FAST_ROOT.
- **Slow tier** (HDD): For cold/archive data. Configured via DEPOT_SLOW_ROOT.
- Auto-tiering: LRU-based eviction from fast to slow after DEPOT_LRU_TTL_DAYS.

### Search Indexes
- **LanceDB**: Vector embeddings for semantic search. Uses BAAI/bge-small-en-v1.5 (384d).
- **SQLite FTS5**: Full-text search sidecar with BM25 ranking for keyword search.
- **Hybrid search**: Reciprocal-rank fusion combining FTS BM25 + vector similarity scores.

### LLM Manager
Auto-discovers Ollama (port 11434) and LM Studio (port 1234) on localhost. Provides LLM-powered semantic operations (summarization, classification) when a local LLM is available. Graceful degradation when no LLM is found.

### Drive Discovery
Scans drive letters A-Z at startup, categorizing as fast (C, D, N) or slow (all others) for the depot. Used for reporting and storage planning.

## REST API Routes (under /api/v1)
- /api/v1/depot/*: File CRUD, tag management, migration.
- /api/v1/capabilities/*: Server capability reporting.
- /api/llm/*: LLM-powered operations.
- /health: Server health.

## Integration Points
- **Fleet web dashboard**: Vite React SOTA dashboard at port 10726.
- **Claude Desktop / Cursor**: STDIO MCP transport for tool access.
- **Other fleet MCP servers**: Plugin entry point for embedding depot-mcp tools.
- **Ollama / LM Studio**: Auto-discovered for LLM-powered features.
- **mcp-central-docs**: Fleet documentation standards.

## Error Handling
All tools return structured dicts with success bool. Errors include human-readable messages and recovery suggestions. The server handles tier directory creation, database initialization, and LLM connection failures gracefully (agentic mode degrades to non-agentic when CodeMode is unavailable). Storage backends are initialized lazily and idempotently.

## Tool Parameter Reference

### depot_management — upload Parameters
- file_path (str, required): Absolute path to a local file. Must exist and be readable. The server does not support wildcards or globs — upload one file at a time.
- preserve_path (bool, default=True): When True, the directory structure relative to the source drive root is preserved in the depot. When False, only the filename is used.
- tags (list[str], optional): Up to 20 tags per file. Tags are lowercased and trimmed. Duplicate tags are silently ignored.
- tier (str, default="fast"): "fast" for NVMe storage, "slow" for HDD storage. The target tier must have sufficient free space.

### depot_management — search Parameters
- query (str, required): For FTS mode, supports standard SQLite FTS5 syntax: phrase queries with double quotes ("search term"), prefix queries with asterisk (term*), AND/OR/NOT operators (term1 AND term2), and grouping with parentheses. For semantic mode, plain natural language queries (e.g., "documents about project planning"). Hybrid mode accepts both.
- limit (int, default=20, max=100): Maximum results returned.
- mode (str, default="hybrid"): "fts" for keyword-only search (fast, precise), "semantic" for vector embedding search (slow, conceptual), "hybrid" for combined reciprocal-rank fusion (balanced).
- file_type (str, optional): Filter by extension without the dot (e.g., "pdf", "py", "json", "md"). Matching is case-insensitive.
- tags (list[str], optional): Filter by tags using AND logic — all specified tags must be present on a file for it to match.
- max_age_days (int, optional): File age filter based on upload/modified timestamp. Only files newer than N days are returned.

### depot_management — migrate Parameters
- depot_path (str, required): Relative path within the depot as returned by upload or search operations. The file must exist in its current tier.
- target_tier (str, required): "fast" or "slow". Migration copies the file to the target tier and removes it from the source tier. The operation is atomic at the filesystem level.

### depot_management — tag Parameters
- action (str, required): "add" attaches new tags (preserving existing ones), "remove" detaches specific tags, "list" returns all tags across the depot with counts, "search" finds files by tag name substring.
- depot_path (str, optional): Required for add and remove actions.
- tags (list[str], optional): Tags to add or remove. Lowercased and trimmed.
- query (str, optional): Tag substring to search for (used with action="search").

## File Indexing Pipeline
When a file is uploaded to the depot, the following indexing pipeline runs:

1. **File Copy**: The source file is copied to the appropriate tier directory under the configured root (fast_root or slow_root). The file retains its original name and directory structure if preserve_path is enabled.
2. **Metadata Extraction**: File size, modification time, type (MIME), and extracted tags are recorded.
3. **FTS Indexing**: The file's metadata (filename, type, tags) is indexed in SQLite FTS5 for keyword search. File content is indexed for text-based files (PDF, TXT, MD, JSON, YAML, XML, CSV, HTML, Python, JavaScript, TypeScript, SQL, YAML, TOML, INI, LOG, BAT, PS1, SH). Binary files are indexed by metadata only.
4. **Vector Embedding**: For files with extractable text content, embeddings are generated using the configured embedding model (default BAAI/bge-small-en-v1.5, 384 dimensions) and stored in LanceDB.
5. **Index Commit**: Both indexes are committed atomically. If either index operation fails, the file is still stored but may not be searchable until reindexing.

## Storage Tier Architecture

### Fast Tier (NVMe)
- Default root: D:\depot\fast (configurable via DEPOT_FAST_ROOT)
- Target: Active files, frequently accessed data, working datasets.
- Performance: Sub-millisecond access, high IOPS.
- Capacity: Limited by NVMe drive size (typically 1-4TB).
- LRU eviction threshold: 7 days (configurable via DEPOT_LRU_TTL_DAYS).

### Slow Tier (HDD)
- Default root: E:\depot\slow (configurable via DEPOT_SLOW_ROOT)
- Target: Archived files, cold data, backups, old versions.
- Performance: Millisecond access, lower IOPS.
- Capacity: Large (typically 4-20TB).
- Retention: Files remain until explicitly deleted or migrated.

### Tier Management Policies
1. **LRU (default)**: Files on the fast tier that have not been accessed for DEPOT_LRU_TTL_DAYS are candidates for automatic migration to the slow tier. Access is tracked by download and search operations.
2. **Explicit**: Files are placed on the specified tier at upload time. No automatic migration. Tier changes must be explicitly requested.
3. **Tag-Based**: Files with certain tags (e.g., "archive", "cold") are automatically placed on or migrated to the slow tier. Files with "hot" or "active" tags are kept on the fast tier.

## Search Service Architecture

### FTS Search (SQLite FTS5)
- Index: SQLite FTS5 virtual table with columns for filename, file_type, tags, and extracted text content.
- Ranking: BM25 algorithm ranking results by term frequency and inverse document frequency.
- Features: Prefix queries (*), phrase queries (""), boolean operators (AND, OR, NOT), column-specific queries (filename:report).

### Semantic Search (LanceDB)
- Index: LanceDB vector table with 384-dimensional float32 embeddings.
- Model: BAAI/bge-small-en-v1.5 via the fastembed library.
- Distance: Cosine similarity for vector comparison.
- Features: Natural language queries, concept matching, cross-lingual similarity (for languages supported by the embedding model).

### Hybrid Search (Reciprocal-Rank Fusion)
- Method: Combines FTS BM25 and LanceDB vector scores using RRF formula: RRF(d) = 1/(60 + rank_fts(d)) + 1/(60 + rank_semantic(d)).
- Benefit: Leverages precision of keyword search with the recall of semantic search. Best overall search quality.
- Performance: Hybrid search is approximately 2x slower than FTS-only due to the additional vector search pass.

## LLM Manager Architecture
The LLM manager auto-discovers local LLM providers at startup:

1. **Ollama Detection**: Sends GET to http://localhost:11434/api/tags. If successful, records available models.
2. **LM Studio Detection**: Sends GET to http://localhost:1234/v1/models. If successful, records available models.
3. **Provider Registration**: Each detected provider is registered with its base URL, available models, and capabilities.
4. **Feature Flagging**: When no local LLM is found, LLM-dependent features (semantic summarization, smart tagging) are disabled gracefully.
5. **Runtime Discovery**: The glom_local_providers_if_up() method is called during server setup and can be called again to re-detect providers.

## Plugin Architecture
The depot-mcp provides a plugin entry point for embedding its tools in other FastMCP servers:

```python
from depot_mcp.plugin import register_plugin
from fastmcp import FastMCP

host_mcp = FastMCP("my-server")
register_plugin(host_mcp)  # Adds depot_management and all sub-tools
```

This enables other fleet MCP servers (fleet-agent-mcp, meta_mcp, etc.) to use the depot as a file storage backend without running a separate process. The plugin mode initializes the depot server lazily and shares the same storage backends.

## Embedding Model Configuration
The depot uses BAAI/bge-small-en-v1.5 (384 dimensions) as the default embedding model for vector search. This model is a good balance of quality and speed — it produces 384-dimensional embeddings that capture semantic meaning well while being fast enough for real-time search. For higher accuracy, use BAAI/bge-base-en-v1.5 (768 dimensions) or BAAI/bge-large-en-v1.5 (1024 dimensions) — these produce more accurate embeddings but are slower and require more storage. For multilingual search, use BAAI/bge-m3 which supports 100+ languages. Custom embedding models can be configured via DEPOT_EMBEDDING_MODEL and must be supported by the fastembed library. When changing the embedding model, the existing LanceDB index becomes incompatible — you must rebuild the index by re-uploading files or running a reindexing operation. The embedding dimension (DEPOT_EMBEDDING_DIM) must match the model's output dimension — check the model documentation for the correct value.

## Skills and Prompts Architecture
The depot-mcp registers 4 FastMCP 3.2 native prompts for common workflows. The depot_overview prompt asks for a summary of file count, tier usage, and connected fleet servers — useful as an initial discovery call. The search_files prompt initiates a file search with user-specified patterns, types, and tags. The storage_report prompt generates a formatted report with tier usage distribution, file type breakdown, and migration recommendations. The migrate_help prompt identifies files that are candidates for tier migration based on access patterns and age. When a skills/ directory exists in the repository, the server registers a SkillsDirectoryProvider that exposes skill:// URIs for MCP client discovery — these skills are markdown files that describe how to use the depot effectively. Skills enable richer client integration than prompts, providing structured instructions that clients can fetch and inject into conversation context.

## Logging and Monitoring
The depot-mcp uses Python's standard logging module with structured log messages. Key events logged include: file uploads (filename, size, tier, tags), file downloads (depot path, output path, size), searches (query text, mode, result count, latency), migrations (path, source tier, target tier), deletions (path, size recovered), tag operations (action, path, tags), index operations (FTS updates, vector embedding generation), LLM operations (model used, query, response). Log levels are: INFO for normal operations, WARNING for recoverable issues (e.g., LLM not available), ERROR for operation failures (e.g., file not found, disk full). For production monitoring, capture stderr output and route it to the fleet Loki instance (port 12002). Key metrics to monitor include: upload throughput (files/minute, MB/minute), search latency (average and p99), tier capacity (used/total per tier), and error rates per operation type. The server does not expose a /metrics Prometheus endpoint — use log-based metrics extraction for monitoring.

## Configuration File Format
The depot-mcp supports YAML configuration files in addition to environment variables. An example config.yaml: fast_root: D:\depot\fast, slow_root: E:\depot\slow, lancedb_path: data/lancedb, fts_db_path: data/depot_fts.db, data_dir: data, tier_policy: lru, lru_ttl_days: 7, chunk_size_mb: 128, max_upload_size_gb: 100, embedding_model: BAAI/bge-small-en-v1.5, embedding_dim: 384, host: 0.0.0.0, port: 10727. Load the config file with DepoConfig.from_yaml("config.yaml"). Environment variables with DEPOT_ prefix override YAML values. The YAML file follows the same field names as the DepoConfig class. All paths can be relative (resolved from the YAML file location) or absolute. For production, use environment variables for sensitive values (paths, model names) and YAML for structured configuration (tier policies, frontend URLs).

## Multi-Instance Considerations
When running multiple depot-mcp instances (e.g., development and production), ensure each instance has its own data directories to prevent index corruption. The LanceDB and SQLite FTS5 databases are not designed for concurrent write access from multiple processes. For shared storage across instances, use a single instance with the REST API for external access rather than multiple independent instances. The plugin mode (register_plugin) embeds depot-mcp tools in a host FastMCP server's process, sharing the same storage backends — this is the recommended approach for fleet integration. For read-only access from multiple instances, configure the secondary instances to use the primary instance's REST API instead of their own storage backends. The file store supports concurrent reads safely but concurrent writes require coordination.

## File Store and I/O Architecture
The FileStore class manages file I/O operations across both storage tiers. It handles: file copy with progress tracking for large files, chunked uploads and downloads, atomic file operations using temporary files and rename, file existence checks, directory creation, and file size retrieval. The TierManager implements the tier management policy (LRU, explicit, or tag-based) and coordinates cross-tier file operations. LRU tracking records file access timestamps for each download and migration operation. The tier manager runs as a periodic background task that scans the fast tier for files exceeding the LRU TTL and queues them for migration. Tag-based tiering assigns files to tiers based on tag matching rules defined in configuration. The file indexer runs after each upload to update both the FTS and vector indexes. For bulk operations (initial seeding, large migrations), the indexer batches updates to reduce index fragmentation.

## Development and Testing
The depot-mcp server follows fleet SOTA development practices. The codebase is organized under src/depot_mcp/ with modules for storage (tier management, file store), metadata (indexing, search, FTS, LanceDB), LLM integration, tools, and configuration. To add a new search mode, extend the SearchService class with a new search method and add it to the depot_management portmanteau's operation enum. To add a new storage backend, implement the FileStore interface with the required methods. Tests are in tests/ and can be run with `uv run pytest`. The justfile provides recipes for serve, test, lint, and pack-mcpb. Type checking with mypy is recommended for new storage backends. The project uses ruff for linting and formatting. The src/ layout follows the standard Python MCP scaffold with pyproject.toml. The plugin entry point in plugin.py enables embedding depot-mcp tools in other FastMCP servers — see the plugin module documentation for integration details.

## Use Cases and Applications
The depot-mcp is designed for: centralizing fleet file storage and management across multiple servers, providing searchable access to documentation and reference files, managing tiered storage for cost-effective data retention, enabling cross-repository file sharing through the plugin interface, supporting LLM-powered file operations (semantic search, summarization, classification), maintaining version history of configuration files and assets, providing a shared file system for multi-server fleet operations, and enabling automated backup management with tiered retention policies. The depot is particularly valuable for fleets with multiple MCP servers that need to share files without duplicating storage or implementing separate file management for each server.

## Data Flow Architecture
When a file is uploaded, the data flows through these stages: the file is read from the source path and written to the target tier directory, the file metadata (name, size, type, modification time) is extracted and stored in the FTS index, the file's text content is extracted for text-based files (PDF via pypdf, office docs via textract, code files as plain text), embeddings are generated from the extracted text using the configured embedding model, the embedding vector is stored in LanceDB with file metadata as associated payload, the file indexer records the operation in its change log, and the search indexes are committed. When a search is executed: the query is parsed and routed to the appropriate search backend(s) based on mode, the backends return ranked result sets with scores, the results are fused (for hybrid mode using RRF), deduplicated, and returned with metadata and relevance scores.

## Performance Considerations
- **Upload speed**: Limited by file I/O speed. Large files (>1GB) use chunked uploads with 64MB default chunk size.
- **Search speed**: FTS search is typically <50ms. Semantic search is 100-500ms depending on index size. Hybrid search is 150-600ms.
- **Index size**: LanceDB index grows proportionally to file count and embedding dimension. Approximately 1.5KB per file (filename + type + tags) + 1.5KB per embedding vector.
- **Tier migration**: File copy speed between tiers depends on filesystem throughput. Large migrations should be done during off-peak hours.
- **Memory usage**: The server maintains no in-memory file index. All searches go through SQLite FTS5 and LanceDB directly.
