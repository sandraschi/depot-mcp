"""Shared test fixtures."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _isolated_depot_data(tmp_path, monkeypatch):
    """Point every depot data store at the test's tmp_path.

    DepoConfig resolves relative data paths against the repo root (BUG-063), so
    monkeypatch.chdir(tmp_path) no longer isolates tests from the real data/
    stores. Explicit absolute env overrides do, whatever the CWD.
    """
    data = tmp_path / "depot-data"
    monkeypatch.setenv("DEPOT_DATA_DIR", str(data))
    monkeypatch.setenv("DEPOT_FTS_DB_PATH", str(data / "depot_fts.db"))
    monkeypatch.setenv("DEPOT_LANCEDB_PATH", str(data / "lancedb"))
