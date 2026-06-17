"""Unified FastMCP + FastAPI server gateway.

[RATIONALE]: Single process hosting both MCP SSE and REST API avoids port
fragmentation and enables shared state between the two access surfaces.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import FastMCP

from depot_mcp.config import DepoConfig
from depot_mcp.llm.manager import get_llm_manager
from depot_mcp.metadata.fts_store import FTSStore
from depot_mcp.metadata.indexer import FileIndexer
from depot_mcp.metadata.lance_store import LanceStore
from depot_mcp.metadata.search import SearchService
from depot_mcp.storage import FileStore
from depot_mcp.storage.tier_manager import TierManager

logger = logging.getLogger(__name__)


def _register_fastmcp_32_parity(mcp: FastMCP, config: DepoConfig) -> None:
    """Register FastMCP 3.2 features: native prompts, skills provider, agentic workflows."""
    try:
        from depot_mcp.prompts import register_prompts

        register_prompts(mcp)
        logger.info("FastMCP 3.2 native prompts registered")
    except Exception as e:
        logger.debug("Prompts registration skipped: %s", e)

    try:
        from fastmcp.server.providers.skills import SkillsDirectoryProvider

        roots = []
        repo_root = Path(__file__).resolve().parent
        for rel in ("skills",):
            rp = repo_root / rel
            if rp.is_dir():
                roots.append(rp)
        if roots:
            mcp.add_provider(SkillsDirectoryProvider(roots=roots))
            logger.info("Skills provider registered (roots=%s)", [str(r) for r in roots])
    except Exception as e:
        logger.debug("Skills provider registration skipped: %s", e)


def register_mcp_surface(
    mcp: FastMCP,
    server: DepoMCPServer,
    config: DepoConfig,
    *,
    agentic: bool = False,
) -> None:
    """Register depot tools, prompts, and skills on any FastMCP instance."""
    from depot_mcp.tools.depot_tool import register_depot_tool

    register_depot_tool(mcp, server=server)
    _register_fastmcp_32_parity(mcp, config)
    if agentic:
        _enable_agentic_mode(mcp, config)


def _enable_agentic_mode(mcp: FastMCP, config: DepoConfig) -> None:
    """Enable CodeMode BM25 discovery and sampling for agentic workflows."""
    try:
        from fastmcp.experimental.transforms import CodeMode

        mcp.add_provider(CodeMode())
        logger.info("CodeMode agentic transforms enabled")
    except Exception as e:
        logger.debug("CodeMode not available: %s", e)


class DepoMCPServer:
    """Singleton server managing FastMCP + FastAPI + storage backends."""

    _instance: DepoMCPServer | None = None
    _lock = asyncio.Lock()

    def __init__(self, config: DepoConfig | None = None, agentic: bool = False) -> None:
        self.config = config or DepoConfig.from_env()
        self.agentic = agentic
        self.llm_manager = get_llm_manager()

        self.file_store = FileStore(self.config)
        self.tier_manager = TierManager(self.config, self.file_store)
        self.lance_store = LanceStore(self.config)
        self.fts_store = FTSStore(self.config)
        self.search_service = SearchService(self.config, self.lance_store, self.fts_store)
        self.file_indexer = FileIndexer(
            self.config, self.file_store, self.tier_manager, self.lance_store, self.fts_store
        )
        self.file_store.file_indexer = self.file_indexer

        self.mcp = FastMCP("depot-mcp", version="0.1.0")
        self.app = FastAPI(title="depot-mcp", version="0.1.0")
        self._setup_cors()

    def _setup_cors(self) -> None:
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "http://localhost:10726",
                "http://127.0.0.1:10726",
                "http://goliath:10726",
                "http://localhost:10727",
                "http://127.0.0.1:10727",
                "http://goliath:10727",
                "http://tauri.localhost",
                "https://tauri.localhost",
                "tauri://localhost",
            ],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    async def setup(self) -> None:
        """Initialize storage backends (idempotent)."""
        async with self._lock:
            if getattr(self, "_setup_done", False):
                return
            self.file_store.init_dirs()
            await self.lance_store.initialize()
            await self.fts_store.initialize()
            await self.llm_manager.glom_local_providers_if_up()
            self._setup_done = True

    async def initialize(self) -> None:
        """Initialize backends and register tools on this server's MCP instance."""
        await self.setup()
        if not getattr(self, "_tools_registered", False):
            register_mcp_surface(self.mcp, self, self.config, agentic=self.agentic)
            self._tools_registered = True

    def run_stdio(self) -> None:
        self.mcp.run(transport="stdio")

    async def run_http(self, host: str = "127.0.0.1", port: int = 10727) -> None:
        await self.initialize()
        import uvicorn

        self._mount_routes()
        config = uvicorn.Config(self.app, host=host, port=port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()

    async def run_sse(self, host: str = "127.0.0.1", port: int = 10727) -> None:
        await self.initialize()
        import uvicorn
        from fastmcp.server.http import create_sse_app

        self._mount_routes()
        sse_app = create_sse_app(self.mcp, message_path="/mcp/message", sse_path="/mcp")
        self.app.mount("/mcp", sse_app)
        config = uvicorn.Config(self.app, host=host, port=port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()

    def _mount_routes(self) -> None:
        if getattr(self, "_routes_mounted", False):
            return

        repo_root = Path(__file__).resolve().parents[2]
        import sys

        if str(repo_root) not in sys.path:
            sys.path.insert(0, str(repo_root))

        from web_sota.backend.routes.capabilities import router as capabilities_router
        from web_sota.backend.routes.depot import create_router
        from web_sota.backend.routes.llm import router as llm_router

        depot_router = create_router(self)
        self.app.include_router(depot_router, prefix="/api/v1")
        self.app.include_router(capabilities_router, prefix="/api")
        self.app.include_router(llm_router, prefix="")

        @self.app.get("/health")
        async def health() -> dict[str, str]:
            return {"status": "ok", "service": "depot-mcp"}

        self._routes_mounted = True
