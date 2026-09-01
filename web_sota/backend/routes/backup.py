"""Backup/restore for fleet depots + memops vault — vault is source, db/vectors are derivatives."""

from __future__ import annotations

import base64
import io
import time
import zipfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse

from depot_mcp.tools.backup_tool import _list_available, _resolve_depot  # reuse logic

router = APIRouter()


@router.get("/list")
async def list_depots():
    return {"depots": _list_available()}


@router.get("/status")
async def status(depot: str):
    try:
        path, note = _resolve_depot(depot)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": f"not found: {path}"})
    files = sum(1 for _ in path.rglob("*") if _.is_file())
    total = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
    return {"depot": depot, "path": str(path), "files": files, "mb": round(total / 1e6, 1), "note": note}


@router.get("/vault")
async def backup_vault(depot: str = "memops-vault"):
    # compat alias for vault; also handles any depot via ?depot=blender-mcp
    return await backup(depot=depot)


@router.get("/backup")
async def backup(depot: str):
    try:
        path, note = _resolve_depot(depot)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": f"not found: {path}"})
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in path.rglob("*"):
            if f.is_file():
                arc = f.relative_to(path.parent) if depot in ("memops-vault", "vault") else f.relative_to(path)  # noqa: SIM108
                zf.write(f, arc)
    buf.seek(0)
    filename = f"{depot}-backup-{time.strftime('%Y-%m-%d')}.zip"
    return StreamingResponse(
        buf, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/restore")
async def restore(depot: str = Form(...), file: UploadFile = File(...)):
    try:
        path, note = _resolve_depot(depot)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    data = await file.read()
    if not data or data[:2] != b"PK":
        return JSONResponse(status_code=400, content={"error": "not a zip (PK header missing)"})
    ts = time.strftime("%Y%m%d_%H%M%S")
    backup_dir = path.parent / f"{path.name}.bak-{ts}"
    if path.exists():
        import shutil

        if path.is_dir():
            shutil.copytree(path, backup_dir)
        else:
            path.rename(backup_dir)
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            if not any(not n.endswith("/") for n in zf.namelist()):
                return JSONResponse(status_code=400, content={"error": "zip contains no files"})
            if path.exists():
                import shutil

                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()
            path.mkdir(parents=True, exist_ok=True)
            for member in zf.infolist():
                name = member.filename
                for prefix in (f"{depot}/", "vault/", "depot/", "data/"):
                    if name.startswith(prefix):
                        name = name[len(prefix) :]
                        break
                if name.startswith("vault/"):
                    name = name[len("vault/") :]
                target = path / name
                if member.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(member) as src, open(target, "wb") as dst:
                        import shutil

                        shutil.copyfileobj(src, dst)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "backup": str(backup_dir)})
    return {"status": "restored", "depot": depot, "path": str(path), "backup": str(backup_dir), "note": note}
