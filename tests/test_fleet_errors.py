"""Tests for the fleet_error/v1 telemetry sink (W2 of FLEET_ERROR_TELEMETRY.md)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))
sys.path.insert(0, str(REPO_ROOT))

RECORD = {
    "schema": "fleet_error/v1",
    "ts": "2026-08-13T03:00:00+00:00",
    "server": "windows-computer-use-mcp",
    "tool": "automation_elements",
    "operation": "click",
    "error_type": "element_not_found",
    "message": "no element matched",
    "params": {"title": "Save"},
    "recovery": ["use title= not text="],
}


@pytest.fixture
def fleet_errors_client(tmp_path, monkeypatch):
    monkeypatch.setenv("DEPOT_FAST_ROOT", str(tmp_path / "fast"))
    monkeypatch.setenv("DEPOT_SLOW_ROOT", str(tmp_path / "slow"))
    monkeypatch.chdir(tmp_path)

    from depot_mcp.config import DepoConfig
    from depot_mcp.server import DepoMCPServer
    from web_sota.backend.routes.fleet_errors import create_fleet_errors_router

    config = DepoConfig.from_env()
    server = DepoMCPServer(config=config)

    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(create_fleet_errors_router(server), prefix="/api/v1")
    return TestClient(app), server


def test_ingest_query_roundtrip(fleet_errors_client):
    client, _server = fleet_errors_client
    resp = client.post("/api/v1/fleet/errors/ingest", json={"records": [RECORD]})
    assert resp.status_code == 200
    assert resp.json()["data"]["ingested"] == 1

    query = client.get("/api/v1/fleet/errors/query", params={"tool": "automation_elements"})
    assert query.status_code == 200
    body = query.json()
    assert body["count"] == 1
    row = body["results"][0]
    assert row["server"] == "windows-computer-use-mcp"
    assert row["error_type"] == "element_not_found"
    assert row["recovery"] == ["use title= not text="]
    assert row["params"] == {"title": "Save"}


def test_ingest_dedupes_by_server_ts(fleet_errors_client):
    client, _server = fleet_errors_client
    first = client.post("/api/v1/fleet/errors/ingest", json={"records": [RECORD]})
    second = client.post("/api/v1/fleet/errors/ingest", json={"records": [RECORD]})
    assert first.json()["data"]["ingested"] == 1
    assert second.json()["data"]["deduped"] == 1

    stats = client.get("/api/v1/fleet/errors/stats")
    assert stats.json()["data"]["total"] == 1


def test_ingest_rejects_incomplete_records(fleet_errors_client):
    client, _server = fleet_errors_client
    broken = {"server": "x"}  # missing ts/tool/error_type/message
    resp = client.post("/api/v1/fleet/errors/ingest", json={"records": [broken]})
    assert resp.status_code == 200
    assert resp.json()["data"]["ingested"] == 0

    stats = client.get("/api/v1/fleet/errors/stats")
    assert stats.json()["data"]["total"] == 0


def test_query_filters_by_error_type(fleet_errors_client):
    client, _server = fleet_errors_client
    other = {**RECORD, "ts": "2026-08-13T03:01:00+00:00", "error_type": "timeout", "tool": "automation_mouse"}
    client.post("/api/v1/fleet/errors/ingest", json={"records": [RECORD, other]})

    only_timeout = client.get("/api/v1/fleet/errors/query", params={"error_type": "timeout"})
    assert only_timeout.json()["count"] == 1
    assert only_timeout.json()["results"][0]["tool"] == "automation_mouse"


def test_store_query_orders_newest_first(fleet_errors_client):
    _client, server = fleet_errors_client
    old = {**RECORD, "ts": "2026-08-13T02:00:00+00:00", "message": "old"}
    new = {**RECORD, "ts": "2026-08-13T04:00:00+00:00", "message": "new"}
    server.fleet_error_store.ingest([old, new])
    rows = server.fleet_error_store.query(last_n=10)
    assert rows[0]["message"] == "new"
    assert rows[1]["message"] == "old"
