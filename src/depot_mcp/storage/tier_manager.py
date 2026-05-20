"""Tier manager — coordinates routing, migration, and policy."""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from depot_mcp.storage.tier_policy import ExplicitTierPolicy, LRUTierPolicy, TagBasedTierPolicy, TierPolicy

if TYPE_CHECKING:
    from depot_mcp.config import DepoConfig
    from depot_mcp.storage.file_store import FileStore

logger = logging.getLogger(__name__)


class TierManager:
    """Manages storage tier routing and migration."""

    def __init__(self, config: DepoConfig, file_store: FileStore) -> None:
        self.config = config
        self.file_store = file_store
        self._policies: dict[str, TierPolicy] = {
            "lru": LRUTierPolicy(config),
            "explicit": ExplicitTierPolicy(config),
            "tag_based": TagBasedTierPolicy(config),
        }

    @property
    def active_policy(self) -> TierPolicy:
        return self._policies.get(self.config.tier_policy, self._policies["lru"])

    def get_policy(self, name: str) -> TierPolicy | None:
        return self._policies.get(name)

    def classify(self, filename: str, mime_type: str, tags: list[str] | None = None, override_policy: str | None = None) -> str:
        policy = self._policies.get(override_policy, self.active_policy) if override_policy else self.active_policy
        return policy.classify(filename, mime_type, tags)

    async def migrate(self, file_id: str, from_tier: str, to_tier: str, filename: str) -> dict:
        new_path = await self.file_store.move_between_tiers(file_id, from_tier, to_tier, filename)
        if new_path is None:
            return {"success": False, "error": f"Migration failed for {file_id}"}
        return {"success": True, "file_id": file_id, "from_tier": from_tier, "to_tier": to_tier, "new_path": str(new_path)}

    async def run_lru_eviction(self, file_metas: list[dict]) -> list[dict]:
        """Background job: scan all files, migrate cold ones to slow tier."""
        results = []
        policy = self._policies["lru"]
        for meta in file_metas:
            if policy.should_migrate(meta):
                target = policy.target_tier(meta)
                if target != meta.get("tier"):
                    result = await self.migrate(
                        meta["id"], meta["tier"], target, meta["filename"]
                    )
                    results.append(result)
                    meta["tier"] = target
                    meta["last_accessed"] = time.time()
        return results
