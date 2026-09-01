"""Fleet advertise/consume — repos POST their depot, depot-mcp stores registry."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from depot_mcp.fleet_registry import advertise, list_advertised, list_all_with_fallback, unadvertise, discover_manifests

router = APIRouter()


class AdvertiseIn(BaseModel):
    depot: str  # e.g. "blender-mcp" or "memops-vault"
    path: str  # absolute or repo-relative; will be resolved
    repo: str | None = None
    tags: list[str] | None = None
    note: str | None = None


@router.post("/advertise")
async def fleet_advertise(inp: AdvertiseIn):
    try:
        entry = advertise(inp.depot, inp.path, inp.repo, inp.tags, inp.note)
        return {"success": True, "advertised": entry}
    except Exception as e:
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})


@router.delete("/advertise/{depot}")
async def fleet_unadvertise(depot: str):
    ok = unadvertise(depot)
    return {"success": ok, "depot": depot}


@router.get("/advertised")
async def fleet_list():
    return {"advertised": list_advertised(), "manifests": discover_manifests(), "all": list_all_with_fallback()}


@router.get("/discover")
async def fleet_discover():
    # trigger a fresh scan (advertised + manifests) — no body needed
    return {"advertised": list_advertised(), "manifests": discover_manifests()}
