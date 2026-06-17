"""Web-SOTA backend entry point for depot-mcp.

Run with: python -m web_sota.backend.server --port 10727
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("depot.backend")


async def main(host: str = "127.0.0.1", port: int = 10727) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(repo_root / "src"))

    from depot_mcp.config import DepoConfig
    from depot_mcp.server import DepoMCPServer

    config = DepoConfig.from_env()
    server = DepoMCPServer(config=config, agentic=True)
    logger.info("Starting depot-mcp backend on http://%s:%s", host, port)
    await server.run_sse(host=host, port=port)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=10727)
    args = parser.parse_args()
    asyncio.run(main(args.host, args.port))
