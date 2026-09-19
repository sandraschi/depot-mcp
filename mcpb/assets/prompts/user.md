# schip-mcp-depot — User Guide

## Quick Start

### Installation
1. Clone: `git clone https://github.com/sandraschi/depot-mcp.git`
2. Create virtual env: `uv venv`
3. Activate: `.venv\Scripts\activate`
4. Install: `uv sync`
5. Start stdio (Claude Desktop): `uv run python -m depot_mcp`
6. Start HTTP: `uv run python -m depot_mcp --transport http --port 10727`
7. Enable agentic mode: `uv run python -m depot_mcp --agentic`

### First Use
1. Upload a file: `depot_management(operation="upload", file_path="C:/data/report.pdf")`
2. Search the depot: `depot_management(operation="search", query="report")`
3. Check storage stats: `depot_management(operation="stats")`
4. Tag a file: `depot_management(operation="tag", action="add", depot_path="report.pdf", tags=["finance"])`

## Tutorials

### Tutorial 1: Upload a File
Call `depot_management(operation="upload", file_path="D:/Documents/report.pdf")` to store a file in the default fast tier (NVMe). The server copies the file, indexes it for search (both LanceDB vector and SQLite FTS5), and returns the depot path, tier, and file size.

### Tutorial 2: Upload to Slow Tier
Call `depot_management(operation="upload", file_path="D:/old_project/archive.zip", tier="slow")` to store a file directly in the HDD slow tier. Useful for archival data that doesn't need fast access.

### Tutorial 3: Upload with Tags
Call `depot_management(operation="upload", file_path="C:/Users/sandra/photos/vacation.jpg", tags=["photo", "vacation", "2025"])` to attach metadata tags at upload time. Tags are indexed for filtering in search results.

### Tutorial 4: Download a File
Call `depot_management(operation="download", depot_path="reports/2026/Q1/summary.pdf", output_path="C:/Downloads/summary.pdf")`. The server resolves the file from whichever tier it's stored on and copies it to the local path.

### Tutorial 5: Search by Keyword (FTS)
Call `depot_management(operation="search", query="financial report", limit=10)` to search using SQLite FTS5 full-text search with BM25 ranking. Supports standard FTS5 syntax: use AND for multiple terms, OR for alternatives, NOT for exclusion, and * for prefix matching.

### Tutorial 6: Semantic Search (Vector)
Call `depot_management(operation="search", query="documents about project planning methodology", mode="semantic")` to search by meaning rather than exact keywords. Uses LanceDB with BAAI/bge-small-en-v1.5 embeddings (384 dimensions). Best for finding conceptually related content.

### Tutorial 7: Hybrid Search
Call `depot_management(operation="search", query="database schema documentation", mode="hybrid")` (default mode). Combines FTS BM25 and vector similarity scores using reciprocal-rank fusion (RRF). Provides the best overall search quality by leveraging both keyword precision and semantic understanding.

### Tutorial 8: Filter Search by File Type
Call `depot_management(operation="search", query="API", file_type="py")` to find Python files related to APIs. The file_type filter limits results to files with the .py extension. Combine with mode and tags for precise discovery.

### Tutorial 9: Filter Search by Tags
Call `depot_management(operation="search", query="report", tags=["finance", "2026"])` to narrow results to files tagged with both "finance" AND "2026". Tags are OR'd within the tags list.

### Tutorial 10: Check Depot Storage Stats
Call `depot_management(operation="stats")` to see a comprehensive storage report: fast tier file count and size, slow tier usage, total depot size, and available drives on the system (categorized as fast/slow).

### Tutorial 11: Migrate File Between Tiers
Call `depot_management(operation="migrate", depot_path="old_project/data.db", target_tier="slow")` to move a file from fast NVMe storage to slow HDD storage. Use this for cold data that hasn't been accessed recently. The reverse (`target_tier="fast"`) brings hot data back to fast storage.

### Tutorial 12: Delete a File
Call `depot_management(operation="delete", depot_path="temp/cache.tmp")` to remove a file from the depot. The file is deleted from all tiers and all indexes are updated. This is permanent — no trash/recycle bin.

### Tutorial 13: Add Tags to an Existing File
Call `depot_management(operation="tag", action="add", depot_path="report.pdf", tags=["finance", "2026"])` to attach searchable metadata tags to a previously uploaded file. Tags accumulate — existing tags are preserved.

### Tutorial 14: Remove Tags from a File
Call `depot_management(operation="tag", action="remove", depot_path="report.pdf", tags=["draft"])` to detach specific tags from a file. Other tags remain intact.

### Tutorial 15: List All Tags
Call `depot_management(operation="tag", action="list")` to see all tags used across the depot, with file counts per tag. Useful for discovering the tag taxonomy.

### Tutorial 16: Search Files by Tag
Call `depot_management(operation="tag", action="search", query="photo")` to find all files tagged with tags containing "photo".

### Tutorial 17: Multi-Step Storage Management Workflow
1. Upload daily reports: `upload(file_path="D:/data/daily_report.csv", tags=["daily", "report"])`
2. After 30 days: `migrate(depot_path="daily_report.csv", target_tier="slow")`
3. Search for old reports: `search(query="daily report", max_age_days=90, mode="fts")`
4. Download for archive: `download(depot_path="daily_report.csv", output_path="C:/archive/")`
5. Clean up duplicates: `search(query="daily_report")` then `delete(depot_path="...")`

### Tutorial 18: Using Native Prompts
Call the depot_overview prompt to get a quick summary of the fleet depot. Call the storage_report prompt to generate a formatted report with tier usage and recommendations. Call the migrate_help prompt to identify files that are candidates for tier migration.

### Tutorial 19: Agentic Mode Workflows
Start the server with --agentic to enable CodeMode BM25 discovery transforms. In agentic mode, the LLM can autonomously plan and execute multi-step depot operations using tool composition, such as "Find all large CSV files that haven't been accessed in 30 days, migrate them to slow tier, and generate a report."

### Tutorial 20: Plugin Mode Integration
Use the plugin entry point to embed depot-mcp tools in another FastMCP server. Import and call register_plugin(your_mcp_instance) to add depot_management and all sub-tools to your server. Useful for fleet agent MCP servers that need file depot access.

## REST API Reference

### Depot Routes (mounted under /api/v1)
The depot router provides CRUD operations for files, tags, and migration. See the full OpenAPI schema at http://localhost:10727/docs.

### Capabilities Routes (mounted under /api)
Returns server capability matrix, available tools, and configuration.

### LLM Routes
Provides LLM-powered operations (summarization, classification) when a local LLM is detected.

### Health
GET /health → {"status": "ok", "service": "depot-mcp"}

## Troubleshooting

### File not found in search results
Check that the file was uploaded successfully. Search by exact filename with FTS mode. Verify the file wasn't accidentally deleted.

### Upload fails for large files
The default chunk size is 64MB. For files over 1GB, ensure DEPOT_CHUNK_SIZE_MB is appropriate. Maximum upload size is 100GB by default (configurable via DEPOT_MAX_UPLOAD_SIZE_GB). Check available disk space on the target tier.

### Migration fails
Ensure the target tier directory exists (auto-created on init). Check for file locks on the source file. Verify the file hasn't been deleted between the stats check and the migration call.

### Search returns different results than expected
Hybrid search combines FTS and vector scores. For precise keyword matching, use mode="fts". For concept matching, use mode="semantic". The hybrid mode may rank broadly relevant results higher than exact keyword matches.

### LLM features not available
The server auto-discovers Ollama (port 11434) and LM Studio (port 1234). Ensure at least one is running and accessible. The LLM manager will report status in search results or stats.

### Startup fails due to port conflict
The default backend port is 10727. Clear zombie processes: `Get-NetTCPConnection -LocalPort 10727 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`.

## Advanced Workflows

### Workflow: Data Lifecycle Management
Set up a complete data lifecycle for your project files: (1) Upload new files to the fast tier with descriptive tags. (2) After 7 days of inactivity, migrate cold files to the slow tier using the LRU policy. (3) Before deleting old files, search for related content using hybrid search to ensure nothing valuable is lost. (4) Maintain a tag taxonomy (e.g., project, status, type, year) for consistent organization. (5) Periodically run stats to review storage usage and identify optimization opportunities.

### Workflow: Semantic Documentation Hub
Build a searchable documentation repository: (1) Upload all project documentation (READMEs, API specs, architecture docs) with consistent tags like ["documentation", "project-name", "architecture"]. (2) Use semantic search with mode="semantic" to find conceptually related documents even when keywords don't match. (3) For precise lookups (e.g., finding a specific config file), use FTS mode with exact filenames. (4) Use hybrid search as the default for general queries to get the best of both approaches. (5) Tag files by status: "draft", "review", "final", "archived" for lifecycle tracking.

### Workflow: Multi-Project Asset Management
Manage assets across multiple projects: (1) Upload files with project-specific tags (e.g., ["project-alpha", "asset", "design"]) for organization. (2) Search across all projects with project tags to find shared assets. (3) Use migrate to move completed project assets to the slow tier for long-term storage. (4) Before archiving a project, search for all related files using a combination of project tags and date filters. (5) Delete obsolete project files in bulk after verification.

### Workflow: Automated Backup Rotation
Set up automated backup management: (1) Upload daily backups with tags like ["backup", "daily", "database-name"]. (2) After 7 days, migrate old backups to the slow tier. (3) After 30 days, review and delete backups older than 90 days using search with max_age_days and file_type filters. (4) Keep monthly backups indefinitely by tagging them with ["backup", "monthly", "retain"] — these will not be auto-deleted. (5) Run stats monthly to track backup storage growth.

### Workflow: Codebase Search and Analysis
Use the depot as a centralized code repository: (1) Upload source code files with tags for language, project, and module. (2) Search for code by functionality using semantic search (e.g., "authentication logic", "database connection pooling"). (3) Use FTS for exact symbol lookups (e.g., "function_name", "ClassName"). (4) Use file_type filters to narrow by language (py, js, rs, go, ts). (5) Migrate old, unchanged code to the slow tier after releases.

### Workflow: Design Asset Pipeline
Manage design assets across the creative workflow: (1) Upload design files (SVG, PNG, FIG, PSD, AI, SKETCH) with tags for project, asset type, and version. (2) Use tag search to find all assets for a specific project. (3) Download assets for use in the design tool, then upload the revised versions. (4) Migrate finalized assets to the slow tier for archival. (5) Delete obsolete drafts and experimental versions.

### Workflow: Configuration Management
Centralize configuration file management: (1) Upload config files (YAML, JSON, TOML, INI, ENV) with project and environment tags ["project-x", "production", "config"]. (2) Search for specific configurations by combining file_type filters with tags. (3) Use FTS search for specific parameter lookups (e.g., "database_url"). (4) Maintain versioned copies by uploading to the depot before making changes. (5) Roll back by downloading the previous version from the depot.

### Workflow: Compliance and Audit Trail
Maintain an auditable file repository for compliance: (1) Upload all compliance-related documents with tags ["compliance", "year", "regulation-name"]. (2) Use tag search to quickly locate relevant documents during audits. (3) Migrate older compliance docs to the slow tier but never delete them. (4) Run stats to demonstrate storage retention policies. (5) Use the file_type filter combined with tags to prepare evidence packages for auditors.

### Workflow: Cross-Fleet File Sharing
Use the depot as a shared file system across the fleet: (1) Upload shared libraries, SDKs, and tools with appropriate access tags. (2) Other fleet MCP servers use the plugin mode or REST API to access depot files. (3) Search for shared resources using hybrid search with appropriate tags. (4) Use the tag system to indicate maturity level: "stable", "beta", "deprecated". (5) Migrate deprecated files to the slow tier with a "deprecated" tag for transparency.

### Workflow: Media and Asset Versioning
Track versions of binary assets: (1) Upload each version with a version tag (e.g., "v1.0", "v2.0"). (2) Search for all versions of an asset by name. (3) Use the upload timestamp to track the version timeline. (4) Migrate old versions to the slow tier. (5) Delete only versions that are confirmed obsolete across all projects.

## Tag Management Best Practices
Use tags to organize files in the depot effectively. Follow these conventions: use lowercase tags for consistency (the server lowercases tags automatically), use project prefixes for project-specific tags (e.g., "project-alpha", "project-beta"), use type tags for file categories (e.g., "documentation", "code", "config", "asset", "backup", "log"), use status tags for lifecycle (e.g., "draft", "review", "final", "archived", "deprecated"), use env tags for environment association (e.g., "production", "staging", "development", "testing"), and avoid special characters and spaces in tag names. Apply 2-5 tags per file — too few makes search less effective, too many creates noise. Use tag action="list" to discover existing tags before creating new ones to avoid duplication. Use tag action="search" to find files by tag quickly. When removing tags, only the specified tags are removed — other tags remain intact.

## Search Query Syntax Reference
The FTS search mode supports SQLite FTS5 query syntax. Basic terms: "database" finds files containing the word database. Phrase queries: "database connection" (double quotes) finds the exact phrase. Prefix queries: "data*" matches data, database, dataset. Boolean operators: "database AND postgresql", "sqlite OR postgresql", "database NOT mysql". Column-specific: "filename:report" searches only the filename column, "tags:production" searches only the tags column. Grouping: "(sqlite OR postgresql) AND performance" for complex queries. The semantic search mode uses natural language queries — no special syntax needed. Examples: "find me documents about database connection pooling", "show me configuration files for the production environment", "what Python files relate to authentication?" The hybrid mode accepts either syntax and combines results from both backends. The file_type filter is applied after search — it does not use the FTS index but filters the result set by extension. The tags filter also applies post-search using AND logic — all specified tags must be present on a file.

## Backup and Disaster Recovery
While the depot stores files, it does not provide its own backup functionality. Implement a backup strategy for the depot data directories: back up the fast tier root (default D:\depot\fast) and slow tier root (default E:\depot\slow) using your standard backup tool. Back up the SQLite FTS5 database (data/depot_fts.db) and LanceDB directory (data/lancedb) to preserve search indexes without reindexing. Schedule backups during low-usage periods. For disaster recovery, restore the tier directories and database files to the same paths on a new server. If search indexes are not restored, the files remain accessible but search will not work until the indexes are rebuilt — upload a file to trigger reindexing or restart the server to trigger a full index rebuild. The depot data directories grow over time — monitor disk usage and set up alerts at 80% capacity.

## Plugin Mode Common Use Cases
The depot-mcp plugin mode enables other fleet MCP servers to use depot storage. Common integration patterns include: the fleet-agent-mcp using the depot as a shared configuration store for agent behavior files, the meta-mcp orchestrator using the depot for storing fleet topology snapshots and health check results, the documentation-mcp using the depot for storing rendered documentation assets, the chitchat server using the depot for persistent conversation archive storage, the dark-app-factory using the depot for storing generated application artifacts with version tracking, and the arxiv-mcp using the depot for storing paper PDFs and extracted text for RAG. To integrate, import register_plugin from depot_mcp.plugin, create or reuse a FastMCP instance, and call register_plugin(your_mcp). The plugin adds the depot_management tool with all sub-operations to your server's tool surface. The plugin initializes the depot lazily — storage backends are set up on the first tool call.

## Error Recovery Guide
When operations fail, follow these recovery procedures. Upload failure (file not found): verify the source file path exists and is readable. Upload failure (disk full): check available space on the target tier. Download failure (file not found in depot): confirm the depot_path is correct by searching for the file. Search failure (no results): broaden the query, try different search modes, check that the file was indexed. Migration failure (target tier full): free space on the target tier or choose a different target. Migration failure (file in use): close any processes that may have the file locked. Delete failure (file not found): the file may have been deleted already — verify with search. Tag operation failure (file not found): verify the depot_path. The server logs detailed error messages for all operations — check the logs for root cause. Most failures are recoverable by retrying after fixing the identified issue.

## Registry and Discovery
The depot-mcp registers with the MetaMCP orchestrator for fleet discovery when the web_sota backend is running. The discovery process reports: server name, version, available tools and their operations, backend URL and port, frontend URL and port, health status, and storage capacity. Other fleet MCP servers can discover the depot via MetaMCP's server list and use its tools through the MCP protocol. The plugin registration enables other servers to embed depot tools directly. The REST API enables non-MCP clients to use depot functionality. For custom integrations, use the OpenAPI schema at http://localhost:10727/docs for API reference.

## Agentic Mode Workflows
When running with --agentic flag, the depot supports CodeMode BM25 discovery transforms for enhanced agentic operations. In agentic mode, the LLM can autonomously: discover the depot's capabilities and available operations, plan multi-step file management workflows (find files matching criteria, migrate, tag, and generate reports), compose complex search queries with appropriate mode selection, and orchestrate cross-tool workflows involving depot operations and other fleet MCP tools. The agentic transforms are provided by FastMCP's experimental CodeMode feature. Without agentic mode, all depot operations are still available but require explicit tool calling from the client. Agentic mode requires a sampling-capable MCP client (Claude Desktop, Cursor with sampling support). Enable it at startup with the --agentic flag or set DEPOT_AGENTIC=1 in the environment.

## Cross-Tier Search Behavior
When a search is executed, it spans both tiers by default. The search service queries the FTS index (which is unified across tiers) and the LanceDB index (also unified). Results include the tier information for each matching file, allowing you to distinguish between fast and slow tier results. If a file has moved tiers (via migration), the indexes are updated to reflect the new location. The search does not have a tier filter — to search only one tier, use the depot_path prefix. For example, files on the fast tier are under the fast root directory and files on the slow tier are under the slow root directory — the depot_path reflects this structure. When downloading, the server resolves the file from its current tier automatically — you don't need to specify which tier the file is on.

## Large File Handling
The depot supports files up to 100GB by default (configurable via DEPOT_MAX_UPLOAD_SIZE_GB). Large files are uploaded in chunks (default 64MB, configurable via DEPOT_CHUNK_SIZE_MB). Each chunk is written sequentially to the target tier directory. For very large files, the upload may take several minutes — monitor progress via the server logs. Downloads stream the file in chunks — the full file is never held in memory. Large files are indexed by metadata only (filename, size, type, tags) — their content is not extracted for text search. To make large files searchable by content, consider splitting them into smaller parts before uploading or attaching descriptive tags. Tier migration of large files copies the entire file, so migration time is proportional to file size.

## Embedding and Search Quality
The quality of semantic search depends on the embedding model and the nature of the indexed content. BAAI/bge-small-en-v1.5 (default) works well for English text and provides reasonable cross-lingual capability. For domain-specific content (medical, legal, technical), consider fine-tuned embedding models. For code search, consider using code-specific embedding models like codebert or starencoder. The hybrid search mode (default) provides the best balance of precision and recall. If FTS search is returning poor results, check that the query terms are not stop words (common words removed by FTS5) and use phrase queries (double quotes) for exact matching. If semantic search is returning poor results, the content may not be well-represented by the embedding model — try rephrasing the query or using more specific terminology. For multilingual content, use BAAI/bge-m3 which supports 100+ languages.

## File Naming and Organization
The depot preserves the original filename and directory structure on upload when preserve_path is true. This means a file at C:/projects/reports/2026/Q1/summary.pdf becomes reports/2026/Q1/summary.pdf in the depot. When preserve_path is false, only the filename is used. Consider your file organization strategy before uploading: for project-specific files, include the project name in the path; for shared utilities, use a flat structure with descriptive tags; for versioned files, include version numbers in the filename (config_v2.json); for dated files, include dates in the path (reports/2026/01/). The search tool searches across all filenames, paths, and content regardless of directory structure — so organization is primarily for human readability. For very deep directory structures, consider using tags as the primary organization mechanism rather than deep nesting.

## Drive and Storage Planning
The depot auto-discovers available drives by scanning drive letters A-Z. Drives C, D, and N are classified as "fast" (typical NVMe/SSD locations). All other drives are classified as "slow" (potential HDD locations). The stats operation returns this classification in the drives field. Use this information to plan your storage strategy: place frequently accessed files on fast drives, archive old or rarely accessed files on slow drives, and ensure both tier roots have sufficient free space. The default fast root is D:\depot\fast and slow root is E:\depot\slow — configure these via DEPOT_FAST_ROOT and DEPOT_SLOW_ROOT if your drive layout differs. For systems with multiple NVMe drives, consider distributing the fast tier across drives using symbolic links or mount points.

## File Type Detection and Content Extraction
The depot automatically detects file types by extension and extracts text content for indexing. Supported text extraction formats include: plain text (txt, log, cfg, ini, env), markup (md, rst, html, xml, yaml, yml, toml, json), source code (py, js, ts, jsx, tsx, rs, go, java, c, cpp, h, hpp, cs, rb, php, swift, kt, scala, sh, bash, zsh, ps1, bat, sql, r, lua, dart), documents (pdf via pypdf), structured data (csv, tsv), and configuration (dockerfile, makefile, gitignore, editorconfig). Binary files (images, videos, archives, executables) are indexed by filename and metadata only — their content is not searchable. The embedding model processes extracted text up to a configurable maximum — very long files are truncated to the model's token limit (typically 512 tokens per chunk, with multiple chunks for long documents).

## Integration with Other Fleet Servers
The depot-mcp plugin mode allows other MCP servers to use its file storage capabilities. To integrate, import register_plugin from depot_mcp.plugin and call it with your FastMCP instance. This adds the depot_management tool with all its operations to your server. The plugin initializes the depot lazily — storage backends are set up on first use. For servers without plugin support, use the REST API directly at http://localhost:10727/api/v1/depot. The meta-mcp server can discover the depot and include it in fleet health monitoring. The agentic workflow tools in the depot support CodeMode BM25 transforms for enhanced agentic file operations when the --agentic flag is enabled.

## JSON Configuration File Reference
The depot supports configuration via JSON or YAML files. The DepoConfig class reads from environment variables (DEPOT_* prefix) with fallback to a config file. Example config.yaml: fast_root: D:/depot/fast, slow_root: E:/depot/slow, tier_policy: lru, lru_ttl_days: 14, chunk_size_mb: 128, max_upload_size_gb: 200, embedding_model: BAAI/bge-large-en-v1.5, embedding_dim: 768. The from_yaml() class method loads configuration from a YAML file. Environment variables override config file values. The from_env() method creates configuration from environment variables only. Custom embedding models must be supported by the fastembed library — see the fastembed documentation for available models and their dimensions.

## REST API Routes

### Depot Routes (mounted under /api/v1)
The depot router provides file CRUD operations. Full OpenAPI documentation is available at http://localhost:10727/docs when the HTTP server is running. Key routes include:

- **POST /api/v1/depot/upload**: Upload a file. Accepts multipart form data with file and optional metadata fields (tags, tier).
- **GET /api/v1/depot/download/{path}**: Download a file by depot path. Streams the file content in chunks.
- **GET /api/v1/depot/search**: Search the depot. Accepts query, mode, limit, file_type, tags, max_age_days as query parameters.
- **GET /api/v1/depot/stats**: Return storage statistics.
- **POST /api/v1/depot/migrate**: Migrate a file between tiers. Accepts depot_path and target_tier in the request body.
- **DELETE /api/v1/depot/delete**: Delete a file by depot path.
- **POST /api/v1/depot/tag**: Add, remove, or search tags.

### Capabilities Routes (mounted under /api)
- **GET /api/capabilities**: Return server capabilities, available LLM providers, and search modes.

### LLM Routes
- **POST /api/llm/summarize**: Summarize a file's content using the discovered local LLM.
- **GET /api/llm/status**: Check which LLM providers are available and which models are loaded.

### Health
GET /health — Returns {"status": "ok", "service": "depot-mcp"}.

## Performance Optimization

### Search Performance
- For fastest results, use mode="fts" — queries complete in under 50ms for indexes up to 100,000 files.
- For conceptual discovery, use mode="semantic" — expect 100-500ms depending on index size.
- Hybrid mode is best for general use but is approximately 2x slower than FTS-only.
- Use file_type and tag filters to narrow the search space and improve relevance.
- Specify limit to avoid large result sets. Use multiple targeted queries instead of one broad query.

### Storage Optimization
- Use the slow tier for anything accessed less than once a week.
- Set DEPOT_LRU_TTL_DAYS to match your access patterns. Lower values (3-5 days) for aggressive tiering, higher values (14-30 days) for conservative tiering.
- Periodically run stats to identify the largest files and consider whether they belong on the fast tier.
- Delete temporary and draft files regularly. Use tag action="search" query="temp" to find candidates.
- When migrating many files, batch the operations to reduce filesystem overhead.

### Index Maintenance
- The FTS index is updated on every upload and delete. No manual maintenance needed.
- The LanceDB index is updated incrementally. For bulk operations, the indexing pipeline handles batching.
- If the index becomes inconsistent (e.g., after a filesystem-level change), restart the server to trigger reindexing.
- For very large depots (>1M files), consider increasing DEPOT_CHUNK_SIZE_MB to reduce I/O operations.

## Troubleshooting

### Upload Fails for Large Files
Check available disk space on the target tier. Verify DEPOT_MAX_UPLOAD_SIZE_GB is not exceeded. For files over 10GB, consider increasing DEPOT_CHUNK_SIZE_MB to reduce the number of chunks. Ensure the source file is not locked by another process.

### Search Returns Empty Results
Verify the query spelling and syntax. For FTS mode, check that the search terms are not stop words (removed by FTS5). For semantic mode, ensure at least one file has been uploaded with extractable text content. Check that the file_type filter matches the actual file extension.

### Migration Fails Mid-Operation
The target tier may be out of disk space. Check both tier directories: `Get-ChildItem D:\depot\fast -Recurse | Measure-Object -Property Length -Sum` and similarly for slow. If disk space is adequate, check file permissions on both tier directories.

### Tag Search Returns No Results
Verify that tags were added to the file. Use tag action="list" to see all tags in the depot. Check for case mismatches — tags are lowercased during upload. Use tag action="search" with a short substring to find partial matches.

### Server Fails to Start
Check the configured port (10727 default) is not in use. Clear zombie processes with `Get-NetTCPConnection -LocalPort 10727 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`. Verify the data directory is writable. Check that the configured tier roots exist (they are created automatically).

## FAQ

**Q: How does tier management work?**
A: Files are stored on the fast tier (NVMe) by default. The LRU policy migrates files to the slow tier after 7 days of inactivity. You can also explicitly assign files to tiers.

**Q: Can I search across both tiers?**
A: Yes. Search automatically spans both fast and slow tiers. Results indicate which tier each file is on.

**Q: What embedding model is used for vector search?**
A: BAAI/bge-small-en-v1.5 (384 dimensions) via the fastembed library. Configurable via DEPOT_EMBEDDING_MODEL.

**Q: Is the depot accessible from other MCP servers?**
A: Yes. Use the plugin entry point (register_plugin) to embed depot-mcp tools in other FastMCP instances, or use the REST API directly.

**Q: What backup strategy does the depot use?**
A: The depot manages file storage but does not implement its own backup. Use external backup tools to back up the fast and slow tier directories.

**Q: Can I use the depot with Claude Desktop?**
A: Yes. Use stdio transport mode. All depot tools are available directly in chat.

**Q: How do I enable agentic mode?**
A: Pass --agentic on the command line. This enables CodeMode BM25 discovery transforms for enhanced LLM reasoning.
