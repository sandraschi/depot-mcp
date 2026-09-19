"""Tests for the assfix-added API surface: status, skills, logs, llm endpoints."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))
sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    monkeypatch.setenv("DEPOT_FAST_ROOT", str(tmp_path / "fast"))
    monkeypatch.setenv("DEPOT_SLOW_ROOT", str(tmp_path / "slow"))
    monkeypatch.chdir(tmp_path)

    from depot_mcp.server import DepoMCPServer

    server = DepoMCPServer()
    server._mount_routes()
    app: FastAPI = server.app
    return TestClient(app), server


def test_status_shape(api_client):
    client, _server = api_client
    r = client.get("/api/status")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["uptime_seconds"] >= 0
    assert body["tool_count"] == 3
    assert set(body["tools"]) == {"depot_management", "depot_backup", "fleet_errors"}


def test_skills_lists_depot_skill(api_client):
    client, _server = api_client
    r = client.get("/api/skills")
    assert r.status_code == 200
    names = [s["name"] for s in r.json()["skills"]]
    assert "depot-management" in names
    assert all(s["uri"].startswith("skill://") for s in r.json()["skills"])


def test_logs_tail(api_client):
    client, _server = api_client
    r = client.get("/api/v1/logs", params={"limit": 10})
    assert r.status_code == 200
    assert "results" in r.json()


def test_diagnostics_shape(api_client):
    client, _server = api_client
    r = client.get("/api/v1/diagnostics")
    assert r.status_code == 200
    body = r.json()
    assert body["service"] == "depot-mcp"
    assert len(body["tools"]) == 3


def test_llm_discover_no_crash(api_client):
    client, _server = api_client
    r = client.get("/api/llm/discover")
    assert r.status_code == 200
    body = r.json()
    assert len(body["providers"]) == 2
    assert "gpu" in body
    assert "localStorage_keys" in body


def test_llm_onboarding_shape(api_client):
    client, _server = api_client
    r = client.get("/api/llm/onboarding")
    assert r.status_code == 200
    body = r.json()
    assert "configured" in body
    assert "recommended_path" in body and len(body["recommended_path"]) == 3


def test_chat_stream_no_provider_is_503_not_500(api_client, monkeypatch):
    import web_sota.backend.routes.llm as llm_routes

    class _DeadManager:
        async def chat(self, *a, **k):
            return {"error": "test-no-provider"}

    monkeypatch.setattr(llm_routes, "get_llm_manager", lambda: _DeadManager())
    client, _server = api_client
    r = client.post(
        "/api/llm/chat/stream",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert r.status_code == 503
    assert "test-no-provider" in r.json()["detail"]
