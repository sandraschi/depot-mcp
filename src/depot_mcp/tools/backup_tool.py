"""Fleet depot backup/restore — general backup for ALL repo depots + memops vault.

[RATIONALE]: Every maker repo (blender, gimp, inkscape, qcad, freecad, etc) and
the central depot + memops vault has a depot/data dir that needs backup. This
portmanteau keeps the surface to one tool: list/status/backup/restore.

Vault is source of truth — memory.db + vectors/ are derivatives rebuilt via
re-embed (adn_system sync). So vault backup zips only *.md, not the DB.
"""

from __future__ import annotations

import base64
import io
import time
import zipfile
from pathlib import Path
from typing import Annotated, Literal

from fastmcp import FastMCP
from pydantic import Field

try:
    from fastmcp import Context
except ImportError:
    from fastmcp.server.context import Context  # type: ignore

# Fleet depot registry — discovered dynamically + hardcoded special cases
VAULT_PATH = Path.home() / ".advanced-memory" / "vault"
VAULT_DB = Path.home() / ".advanced-memory" / "memory.db"
FLEET_ROOT = Path("D:/Dev/repos")
CENTRAL_FAST = Path("D:/depot/fast")
CENTRAL_SLOW = Path("E:/depot/slow")

KNOWN_MAKER_REPOS = [
    "blender-mcp", "gimp-mcp", "inkscape-mcp", "qcad-mcp", "freecad-mcp",
    "librecad-mcp", "kicad-mcp", "openscad-mcp", "splatmaker-mcp", "worldlabs-mcp",
    "depot-mcp", "calibre-mcp", "plex-mcp", "photoshop-mcp", "davinci-mcp",
]


def _resolve_depot(depot: str) -> tuple[Path, str]:
    """Resolve depot name to Path and human note. Raises ValueError if unknown."""
    depot = depot.strip()
    if depot in ("memops-vault", "vault", "advanced-memory", "memops"):
        return VAULT_PATH, "vault is source — db/vectors are derivatives (re-embed after restore)"
    if depot in ("central", "depot-mcp", "fleet-depot"):
        # central depot has two tiers; caller should backup both, but we return fast as primary
        return CENTRAL_FAST, "central depot fast tier (slow tier is E:/depot/slow)"
    # per-repo depot under fleet root
    candidates = [
        FLEET_ROOT / depot / "depot",
        FLEET_ROOT / depot / "data",
        FLEET_ROOT / depot / "storage",
        FLEET_ROOT / depot / "models",
        FLEET_ROOT / depot,
    ]
    for c in candidates:
        if c.exists() and c.is_dir():
            return c, f"repo depot at {c}"
    # fallback: try as direct path
    p = Path(depot)
    if p.exists() and p.is_dir():
        return p, f"direct path {p}"
    raise ValueError(f"unknown depot: {depot!r} — try list to see available")


def _list_available() -> list[dict]:
    out = []
    # vault
    if VAULT_PATH.exists():
        files = sum(1 for _ in VAULT_PATH.rglob("*.md"))
        mb = sum(f.stat().st_size for f in VAULT_PATH.rglob("*") if f.is_file()) / (1024*1024)
        out.append({"depot": "memops-vault", "path": str(VAULT_PATH), "files": files, "mb": round(mb, 1), "derivative": "memory.db + vectors/ rebuilt from vault"})
    # central
    for name, p in [("central-fast", CENTRAL_FAST), ("central-slow", CENTRAL_SLOW)]:
        if p.exists():
            out.append({"depot": name, "path": str(p), "files": sum(1 for _ in p.rglob("*") if _.is_file()), "mb": round(sum(f.stat().st_size for f in p.rglob("*") if f.is_file())/1e6,1)})
    # per-repo
    for repo in KNOWN_MAKER_REPOS:
        for sub in ("depot", "data", "storage"):
            d = FLEET_ROOT / repo / sub
            if d.exists() and d.is_dir():
                out.append({"depot": repo, "sub": sub, "path": str(d), "files": sum(1 for _ in d.rglob("*") if _.is_file()), "mb": round(sum(f.stat().st_size for f in d.rglob("*") if f.is_file())/1e6,1)})
                break
    # also discover any other repo with depot/data dynamically
    for repo_dir in FLEET_ROOT.iterdir():
        if not repo_dir.is_dir() or repo_dir.name.startswith((".", "_")):
            continue
        if repo_dir.name in KNOWN_MAKER_REPOS:
            continue
        for sub in ("depot", "data"):
            d = repo_dir / sub
            if d.exists() and d.is_dir():
                # only include if non-trivial
                if any(d.iterdir()):
                    out.append({"depot": repo_dir.name, "sub": sub, "path": str(d), "files": sum(1 for _ in d.rglob("*") if _.is_file()), "mb": round(sum(f.stat().st_size for f in d.rglob("*") if f.is_file())/1e6,1)})
                break
    return out


def register_backup_tool(mcp: FastMCP, server=None) -> None:
    @mcp.tool()
    async def depot_backup(
        action: Annotated[Literal["list", "status", "backup", "restore"], Field(description="Backup operation: list available depots, status of one, backup to zip (base64), restore from zip.")],
        depot: Annotated[str | None, Field(description="Depot name: memops-vault, central, or repo name like blender-mcp. Required for status/backup/restore.")] = None,
        file_data_b64: Annotated[str | None, Field(description="Base64 zip for restore (action=restore).")] = None,
        ctx: Context = None,
    ) -> dict:
        """Fleet depot backup/restore — general tool for ALL repo depots + memops vault.

        Vault is source of truth; memory.db + vectors/ are derivatives (rebuilt via re-embed after restore).
        Maker repos (blender, gimp, inkscape, qcad, etc) each have their own depot/data dir — this tool zips/restores any of them.

        ## Return Format
        {"success": bool, "action": str, "data": dict, "error": str|None}

        ## Examples
        depot_backup(action="list")
        depot_backup(action="status", depot="memops-vault")
        depot_backup(action="backup", depot="memops-vault")  # returns {zip_b64, filename}
        depot_backup(action="backup", depot="blender-mcp")
        depot_backup(action="restore", depot="memops-vault", file_data_b64="UEsDBBQ...")
        """
        try:
            if action == "list":
                return {"success": True, "action": "list", "data": {"depots": _list_available()}}
            if action == "status":
                if not depot:
                    return {"success": False, "action": "status", "data": {}, "error": "depot required"}
                path, note = _resolve_depot(depot)
                if not path.exists():
                    return {"success": False, "action": "status", "data": {"depot": depot, "path": str(path)}, "error": "path not found"}
                files = sum(1 for _ in path.rglob("*") if _.is_file())
                total = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
                return {"success": True, "action": "status", "data": {"depot": depot, "path": str(path), "files": files, "mb": round(total/1e6,1), "note": note}}
            if action == "backup":
                if not depot:
                    return {"success": False, "action": "backup", "data": {}, "error": "depot required"}
                path, note = _resolve_depot(depot)
                if not path.exists():
                    return {"success": False, "action": "backup", "data": {}, "error": f"not found: {path}"}
                buf = io.BytesIO()
                with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                    for f in path.rglob("*"):
                        if f.is_file():
                            # for vault, store relative to vault parent so zip contains vault/... prefix
                            if depot in ("memops-vault", "vault"):
                                arc = f.relative_to(path.parent)
                            else:
                                arc = f.relative_to(path)
                            zf.write(f, arc)
                b64 = base64.b64encode(buf.getvalue()).decode()
                filename = f"{depot}-backup-{time.strftime('%Y-%m-%d')}.zip"
                return {"success": True, "action": "backup", "data": {"depot": depot, "path": str(path), "filename": filename, "zip_b64": b64, "bytes": len(buf.getvalue()), "note": note}}
            if action == "restore":
                if not depot or not file_data_b64:
                    return {"success": False, "action": "restore", "data": {}, "error": "depot and file_data_b64 required"}
                path, note = _resolve_depot(depot)
                data = base64.b64decode(file_data_b64)
                if data[:2] != b"PK":
                    return {"success": False, "action": "restore", "data": {}, "error": "not a zip (PK header missing)"}
                ts = time.strftime("%Y%m%d_%H%M%S")
                backup_dir = path.parent / f"{path.name}.bak-{ts}"
                if path.exists():
                    import shutil
                    # copytree for dir, copy for file depot
                    if path.is_dir():
                        import shutil as _sh
                        _sh.copytree(path, backup_dir)
                    else:
                        path.rename(backup_dir)
                try:
                    with zipfile.ZipFile(io.BytesIO(data)) as zf:
                        # must contain at least one file
                        if not any(not n.endswith("/") for n in zf.namelist()):
                            return {"success": False, "action": "restore", "data": {}, "error": "zip contains no files"}
                        # clear target
                        if path.exists():
                            import shutil
                            if path.is_dir():
                                shutil.rmtree(path)
                            else:
                                path.unlink()
                        path.mkdir(parents=True, exist_ok=True)
                        for member in zf.infolist():
                            name = member.filename
                            # strip leading depot/vault prefix if present
                            for prefix in (f"{depot}/", "vault/", "depot/", "data/"):
                                if name.startswith(prefix):
                                    name = name[len(prefix):]
                                    break
                            # also handle memops-vault zip which contains vault/... structure
                            if name.startswith("vault/"):
                                name = name[len("vault/"):]
                            target = path / name
                            if member.is_dir():
                                target.mkdir(parents=True, exist_ok=True)
                            else:
                                target.parent.mkdir(parents=True, exist_ok=True)
                                with zf.open(member) as src, open(target, "wb") as dst:
                                    import shutil
                                    shutil.copyfileobj(src, dst)
                except Exception as e:
                    return {"success": False, "action": "restore", "data": {"backup": str(backup_dir)}, "error": str(e)}
                return {"success": True, "action": "restore", "data": {"depot": depot, "path": str(path), "backup": str(backup_dir), "note": note + " — db/vectors will re-embed on next sync if vault"}}
            return {"success": False, "action": action, "data": {}, "error": f"unknown action {action}"}
        except Exception as e:
            return {"success": False, "action": action, "data": {}, "error": str(e)}
