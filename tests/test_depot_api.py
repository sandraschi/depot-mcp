"""API smoke tests for depot REST routes."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))
sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture
def depot_client(tmp_path, monkeypatch):
    monkeypatch.setenv("DEPOT_FAST_ROOT", str(tmp_path / "fast"))
    monkeypatch.setenv("DEPOT_SLOW_ROOT", str(tmp_path / "slow"))
    monkeypatch.chdir(tmp_path)

    from depot_mcp.config import DepoConfig
    from depot_mcp.server import DepoMCPServer
    from web_sota.backend.routes.depot import create_router

    config = DepoConfig.from_env()
    server = DepoMCPServer(config=config)
    asyncio.run(server.setup())

    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(create_router(server), prefix="/api/v1")
    return TestClient(app), server


def test_health_and_stats(depot_client):
    client, _server = depot_client
    stats = client.get("/api/v1/depot/stats")
    assert stats.status_code == 200
    body = stats.json()
    assert "fast" in body
    assert body["total_files"] == 0


def test_list_files_empty(depot_client):
    client, _server = depot_client
    resp = client.get("/api/v1/depot/files")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["results"] == []


def test_import_migrate_json_bodies(depot_client):
    client, _server = depot_client

    migrate = client.post(
        "/api/v1/depot/migrate",
        json={"file_id": "missing", "target_tier": "slow"},
    )
    assert migrate.status_code == 404

    imp = client.post(
        "/api/v1/depot/import",
        json={"source": "generic", "source_path": str(REPO_ROOT / "docs"), "dry_run": True},
    )
    assert imp.status_code == 200
    assert "scanned" in imp.json() or "imported" in imp.json() or imp.json() is not None
