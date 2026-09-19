"""Portmanteau fleet error telemetry MCP tool.

[RATIONALE]: Consolidates fleet_error/v1 ingest, query, and stats into one tool
following the fleet portmanteau pattern (see depot_tool.py). The depot is the
cross-server "why did the last three attempts fail" query point - see
mcp-central-docs patterns/FLEET_ERROR_TELEMETRY.md.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastmcp import FastMCP
from pydantic import Field

try:
    from fastmcp import Context
except ImportError:
    from fastmcp.server.context import Context


def register_fleet_errors_tool(mcp: FastMCP, server: Any = None) -> None:
    @mcp.tool()
    async def fleet_errors(
        operation: Annotated[
            Literal["ingest", "query", "stats"],
            Field(description="Operation to perform on the fleet error telemetry store."),
        ],
        records: Annotated[
            list[dict] | None,
            Field(description="fleet_error/v1 records to ingest. Required for ingest."),
        ] = None,
        server_name: Annotated[str | None, Field(description="Filter by source server.")] = None,
        tool: Annotated[str | None, Field(description="Filter by failing tool name.")] = None,
        error_type: Annotated[str | None, Field(description="Filter by error category.")] = None,
        since: Annotated[str | None, Field(description="ISO 8601 lower bound on record ts.")] = None,
        limit: Annotated[int, Field(description="Max results.", ge=1, le=500)] = 20,
        ctx: Context = None,
    ) -> dict:
        """Fleet error telemetry hub. Ingest fleet_error/v1 records from fleet servers and query
        cross-server failure history to self-correct retry parameters.

        [RATIONALE]: The depot aggregates the fleet's per-server error ring buffers so an agent
        blocked on a UI element or transaction can ask why previous attempts failed across
        similar tools and prefer recorded recovery hints over blind retries.

        ## Return Format
        {"success": bool, "operation": str, "data": dict, "error": str|None}

        ## Examples
        fleet_errors(operation="ingest", records=[{"ts": "...", "server": "windows-computer-use-mcp",
            "tool": "automation_elements", "error_type": "element_not_found", "message": "...",
            "recovery": ["use title="]}])
        fleet_errors(operation="query", tool="automation_elements", error_type="element_not_found")
        fleet_errors(operation="stats")
        """
        if server is None:
            return {"success": False, "operation": operation, "data": {}, "error": "Server not initialized"}
        store = getattr(server, "fleet_error_store", None)
        if store is None:
            return {"success": False, "operation": operation, "data": {}, "error": "Fleet error store not initialized"}

        try:
            if operation == "ingest":
                if not records:
                    return {"success": False, "operation": operation, "data": {}, "error": "records required"}
                result = store.ingest(records)
                return {"success": True, "operation": operation, "data": result}
            elif operation == "query":
                rows = store.query(server=server_name, tool=tool, error_type=error_type, since=since, last_n=limit)
                return {"success": True, "operation": operation, "data": {"results": rows, "count": len(rows)}}
            elif operation == "stats":
                return {"success": True, "operation": operation, "data": store.stats()}
            else:
                return {
                    "success": False,
                    "operation": operation,
                    "data": {},
                    "error": f"Unknown operation: {operation}",
                }
        except Exception as e:
            return {"success": False, "operation": operation, "data": {}, "error": str(e)}
