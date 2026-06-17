"""Plugin entry point for FastMCP discovery."""

from __future__ import annotations

import asyncio

from fastmcp import FastMCP

_plugin_server = None


def _get_plugin_server():
    global _plugin_server
    if _plugin_server is None:
        from depot_mcp.config import DepoConfig
        from depot_mcp.server import DepoMCPServer

        _plugin_server = DepoMCPServer(config=DepoConfig.from_env())
        asyncio.run(_plugin_server.setup())
    return _plugin_server


def register_plugin(mcp: FastMCP) -> None:
    """Register depot-mcp tools with a host FastMCP instance."""
    from depot_mcp.server import register_mcp_surface

    server = _get_plugin_server()
    register_mcp_surface(mcp, server, server.config, agentic=False)
