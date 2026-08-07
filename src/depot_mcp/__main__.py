"""depot-mcp entry point — CLI with stdio/http/sse transports and agentic mode."""

import argparse
import asyncio
import logging

from depot_mcp.config import DepoConfig
from depot_mcp.server import DepoMCPServer

logger = logging.getLogger(__name__)


def main():
    proxy_url = os.getenv("DEPOT_MCP_API_URL", "http://127.0.0.1:10727/mcp")
    try:
        import httpx

        r = httpx.post(
            proxy_url,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-11-25",
                    "capabilities": {},
                    "clientInfo": {"name": "probe", "version": "1"},
                },
            },
            headers={"Accept": "application/json, text/event-stream"},
            timeout=0.5,
        )
        if r.status_code == 200:
            from fastmcp.server import create_proxy

            proxy = create_proxy(proxy_url, name="depot-mcp")
            proxy.run(transport="stdio")
            return
    except Exception:
        pass
    parser = argparse.ArgumentParser(description="depot-mcp — Fleet File Depot")
    parser.add_argument("--transport", choices=["stdio", "http", "sse"], default="stdio", help="Transport mode")
    parser.add_argument("--port", type=int, default=10727, help="HTTP/SSE port")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--agentic", action="store_true", help="Enable CodeMode BM25 agentic transforms")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    if args.debug:
        logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    else:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    config = DepoConfig()
    server = DepoMCPServer(config=config, agentic=args.agentic)

    if args.transport == "stdio":
        asyncio.run(server.initialize())
        server.run_stdio()
    elif args.transport == "http":
        asyncio.run(server.run_http(host=args.host, port=args.port))
    elif args.transport == "sse":
        asyncio.run(server.run_sse(host=args.host, port=args.port))


if __name__ == "__main__":
    main()
