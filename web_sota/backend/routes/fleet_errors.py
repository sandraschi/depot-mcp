from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from depot_mcp.server import DepoMCPServer


class FleetErrorsIngestRequest(BaseModel):
    records: list[dict] = Field(
        ...,
        description="fleet_error/v1 records (see patterns/FLEET_ERROR_TELEMETRY.md).",
        min_length=1,
    )


def create_fleet_errors_router(server: DepoMCPServer):
    from fastapi import APIRouter, Query

    router = APIRouter(tags=["fleet-errors"])

    @router.post("/fleet/errors/ingest")
    async def ingest_errors(body: FleetErrorsIngestRequest):
        """Accept a ring-buffer tail push from a fleet server. Deduped by (server, ts)."""
        result = server.fleet_error_store.ingest(body.records)
        return {"success": True, "data": result}

    @router.get("/fleet/errors/query")
    async def query_errors(
        server_name: str | None = Query(default=None),
        tool: str | None = Query(default=None),
        error_type: str | None = Query(default=None),
        since: str | None = Query(default=None),
        limit: int = Query(default=20, ge=1, le=500),
    ):
        rows = server.fleet_error_store.query(
            server=server_name, tool=tool, error_type=error_type, since=since, last_n=limit
        )
        return {"success": True, "count": len(rows), "results": rows}

    @router.get("/fleet/errors/stats")
    async def error_stats():
        return {"success": True, "data": server.fleet_error_store.stats()}

    return router
