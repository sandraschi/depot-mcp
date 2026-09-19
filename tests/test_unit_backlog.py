"""Fast unit tests: tier policies, prompts, registry, config, resolvers, GPU utils."""

from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))
sys.path.insert(0, str(REPO_ROOT))


@pytest.fixture
def depo_config(tmp_path, monkeypatch):
    monkeypatch.setenv("DEPOT_FAST_ROOT", str(tmp_path / "fast"))
    monkeypatch.setenv("DEPOT_SLOW_ROOT", str(tmp_path / "slow"))
    monkeypatch.chdir(tmp_path)
    from depot_mcp.config import DepoConfig

    return DepoConfig.from_env()


def test_lru_classify_fast_and_migrate_stale(depo_config):
    from depot_mcp.storage.tier_policy import LRUTierPolicy

    p = LRUTierPolicy(depo_config)
    assert p.classify("anything.blend", "x", None) == "fast"
    stale = {"tier": "fast", "last_accessed": time.time() - 30 * 86400}
    assert p.should_migrate(stale) is True
    assert p.target_tier(stale) == "slow"
    fresh = {"tier": "fast", "last_accessed": time.time()}
    assert p.should_migrate(fresh) is False
    assert p.target_tier(fresh) == "fast"


def test_explicit_never_migrates(depo_config):
    from depot_mcp.storage.tier_policy import ExplicitTierPolicy

    p = ExplicitTierPolicy(depo_config)
    assert p.classify("x.gguf", "y", None) == "fast"
    assert p.should_migrate({"tier": "slow", "last_accessed": 0}) is False
    assert p.target_tier({"tier": "slow"}) == "slow"


def test_tag_based_routes_by_extension(depo_config):
    from depot_mcp.storage.tier_policy import TagBasedTierPolicy

    p = TagBasedTierPolicy(depo_config)
    assert p.classify("model.gguf", "", None) == "slow"
    assert p.classify("scene.blend", "", None) == "fast"
    assert p.classify("notes.md", "", None) == "fast"
    assert p.classify("mystery.xyz", "", None) == "fast"
    assert p.should_migrate({"filename": "model.gguf", "mime_type": "", "tier": "fast"}) is True


async def _noop():
    return None


def test_prompts_register_all_four():
    import asyncio

    from fastmcp import FastMCP

    from depot_mcp.prompts import register_prompts

    mcp = FastMCP("probe")
    register_prompts(mcp)
    prompts = asyncio.run(mcp.list_prompts())
    assert len(prompts) == 4


def test_registry_advertise_roundtrip(tmp_path, monkeypatch):
    import depot_mcp.fleet_registry as reg

    monkeypatch.setattr(reg, "REGISTRY_PATH", tmp_path / "advertised_depots.json")
    target = tmp_path / "some-depot"
    target.mkdir()
    entry = reg.advertise("some-depot", str(target))
    assert entry["depot"] == "some-depot"
    assert any(e["depot"] == "some-depot" for e in reg.list_advertised())
    assert reg.unadvertise("some-depot") is True
    assert reg.list_advertised() == []


def test_registry_rejects_missing_path(tmp_path, monkeypatch):
    import depot_mcp.fleet_registry as reg

    monkeypatch.setattr(reg, "REGISTRY_PATH", tmp_path / "advertised_depots.json")
    with pytest.raises(ValueError):
        reg.advertise("ghost", str(tmp_path / "nope"))


def test_backup_resolve_vault_and_unknown():
    from depot_mcp.tools.backup_tool import _resolve_depot

    path, note = _resolve_depot("memops-vault")
    assert path.name == "vault"
    assert "source" in note
    with pytest.raises(ValueError):
        _resolve_depot("definitely-not-a-depot-xyz")


def test_config_defaults_from_env(depo_config, tmp_path):
    assert depo_config.fast_root == tmp_path / "fast"
    assert depo_config.slow_root == tmp_path / "slow"
    assert depo_config.tier_policy == "lru"
    assert depo_config.port == 10727
    assert depo_config.frontend_port == 10726
    assert depo_config.fast_root.exists()


def test_gpu_detect_never_raises(monkeypatch):
    import web_sota.backend.routes.llm as llm_routes

    monkeypatch.setattr(llm_routes.shutil, "which", lambda *_a, **_k: None)
    info = llm_routes._detect_gpu()
    assert info["present"] is False


def test_tier_manager_policy_selection(depo_config):
    from depot_mcp.storage import FileStore
    from depot_mcp.storage.tier_manager import TierManager

    tm = TierManager(depo_config, FileStore(depo_config))
    assert tm.active_policy is not None
    assert tm.get_policy("nope") is None
    assert tm.classify("scene.blend", "", None) in ("fast", "slow")
