"""Web-SOTA backend entry point for depot-mcp.

Run with: python -m web_sota.backend.server --port 10727
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("depot.backend")


async def main(host: str = "127.0.0.1", port: int = 10727) -> None:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

    from depot_mcp.config import DepoConfig
    from depot_mcp.server import DepoMCPServer

    config = DepoConfig.from_env()
    server = DepoMCPServer(config=config, agentic=True)
    await server.initialize()

    from web_sota.backend.routes.capabilities import router as cap_router
    from web_sota.backend.routes.depot import create_router
    from web_sota.backend.routes.llm import router as llm_router

    depot_router = create_router(server)
    server.app.include_router(depot_router, prefix="/api/v1")
    server.app.include_router(cap_router, prefix="/api")
    server.app.include_router(llm_router, prefix="")
    from fastmcp.server.http import create_sse_app

    sse_app = create_sse_app(server.mcp, message_path="/mcp/message", sse_path="/mcp")
    server.app.mount("/mcp", sse_app)

    import uvicorn

    uvicorn_config = uvicorn.Config(server.app, host=host, port=port, log_level="info")
    uvicorn_server = uvicorn.Server(uvicorn_config)
    await uvicorn_server.serve()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=10727)
    args = parser.parse_args()
    asyncio.run(main(args.host, args.port))

@app.get("/api/llm/providers")
async def llm_providers():
    import httpx
    result = {}
    for name, url in [("ollama", "http://127.0.0.1:11434/api/tags"), ("lm_studio", "http://127.0.0.1:1234/v1/models")]:
        try:
            r = httpx.get(url, timeout=3)
            if r.status_code == 200:
                data = r.json()
                if name == "ollama":
                    result[name] = [{"name": m["name"]} for m in data.get("models", [])]
                else:
                    result[name] = [{"name": m["id"]} for m in data.get("data", [])]
            else:
                result[name] = []
        except Exception:
            result[name] = []
    if not any(result.values()):
        result["ollama"] = [{"name": "llama3.2:3b"}]
    return result

