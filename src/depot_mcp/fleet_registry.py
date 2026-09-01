"""Fleet depot registry — advertised depots + manifest discovery.

[RATIONALE]: Passive fs scan (KNOWN_MAKER_REPOS + rglob) misses new repos and
custom paths. Active advertise (POST at startup) + .depot.json manifest lets
any maker repo (blender, gimp, inkscape, qcad, freecad, splatmaker, etc) declare
its depot and depot-mcp consumes it as source of truth, with scan as fallback.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

REGISTRY_PATH = Path(__file__).resolve().parents[2] / "data" / "advertised_depots.json"
FLEET_ROOT = Path("D:/Dev/repos")
MANIFEST_NAME = ".depot.json"


def _load() -> dict[str, dict[str, Any]]:
    if not REGISTRY_PATH.exists():
        return {}
    try:
        return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save(data: dict[str, dict[str, Any]]) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def advertise(depot: str, path: str, repo: str | None = None, tags: list[str] | None = None, note: str | None = None) -> dict:
    """Register or update an advertised depot. Called via MCP or REST."""
    p = Path(path)
    if not p.exists():
        raise ValueError(f"path not found: {path}")
    if not p.is_dir():
        raise ValueError(f"path is not a directory: {path}")
    data = _load()
    key = depot.strip()
    data[key] = {
        "depot": key,
        "path": str(p.resolve()),
        "repo": repo or key,
        "tags": tags or [],
        "note": note or "",
        "advertised_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "advertised_via": "api",
    }
    _save(data)
    return data[key]


def unadvertise(depot: str) -> bool:
    data = _load()
    if depot in data:
        del data[depot]
        _save(data)
        return True
    return False


def list_advertised() -> list[dict]:
    return list(_load().values())


def discover_manifests() -> list[dict]:
    """Scan fleet root for .depot.json manifests — declarative alternative to POST."""
    out = []
    for repo_dir in FLEET_ROOT.iterdir():
        if not repo_dir.is_dir() or repo_dir.name.startswith((".", "_")):
            continue
        manifest = repo_dir / MANIFEST_NAME
        if not manifest.exists():
            continue
        try:
            cfg = json.loads(manifest.read_text(encoding="utf-8"))
            # expected: {"depot": "blender-mcp", "path": "depot", "tags": ["blend"]}
            raw_path = cfg.get("path", "depot")
            p = (repo_dir / raw_path) if not Path(raw_path).is_absolute() else Path(raw_path)
            if p.exists():
                out.append({
                    "depot": cfg.get("depot", repo_dir.name),
                    "path": str(p.resolve()),
                    "repo": repo_dir.name,
                    "tags": cfg.get("tags", []),
                    "note": cfg.get("note", "via .depot.json manifest"),
                    "manifest": str(manifest),
                })
        except Exception:
            continue
    return out


def list_all_with_fallback() -> list[dict]:
    """Advertised + manifest-discovered + legacy scan fallback — unified view for backup/status."""
    # advertised is source of truth; manifests supplement; scan is last resort
    advertised = {d["depot"]: d for d in list_advertised()}
    for m in discover_manifests():
        advertised.setdefault(m["depot"], m)
    # fallback: if nothing advertised, include legacy KNOWN check via backup_tool._list_available
    # caller merges with that; we just return advertised+manifest here
    return list(advertised.values())
