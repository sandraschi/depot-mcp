"""Plugin entry point for FastMCP discovery."""

from fastmcp import FastMCP


def register_plugin(mcp: FastMCP) -> None:
    """Register depot-mcp tools with a FastMCP instance."""
    from depot_mcp.tools.depot_tool import register_depot_tool

    register_depot_tool(mcp)
