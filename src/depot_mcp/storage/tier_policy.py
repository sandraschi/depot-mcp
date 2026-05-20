"""Tier routing policies.

[RATIONALE]: Pluggable tier policies allow the depot to adapt to different
workloads without code changes. LRU for general use, Explicit for manual control,
TagBased for rule-driven routing.
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from depot_mcp.config import DepoConfig


class TierPolicy(ABC):
    """Abstract base for tier routing policies."""

    def __init__(self, config: DepoConfig) -> None:
        self.config = config

    @abstractmethod
    def classify(self, filename: str, mime_type: str, tags: list[str] | None = None) -> str:
        """Return 'fast' or 'slow' for a new file."""

    @abstractmethod
    def should_migrate(self, file_meta: dict) -> bool:
        """Return True if file should be moved between tiers."""

    @abstractmethod
    def target_tier(self, file_meta: dict) -> str:
        """Return the tier this file should migrate to."""


class LRUTierPolicy(TierPolicy):
    """Files accessed within TTL stay fast. Stale files migrate to slow."""

    def classify(self, filename: str, mime_type: str, tags: list[str] | None = None) -> str:
        return "fast"

    def should_migrate(self, file_meta: dict) -> bool:
        import time

        ttl = self.config.lru_ttl_days * 86400
        last = file_meta.get("last_accessed", 0)
        age = time.time() - last
        current_tier = file_meta.get("tier", "fast")
        return (current_tier == "fast" and age > ttl) or (current_tier == "slow" and age <= ttl)

    def target_tier(self, file_meta: dict) -> str:
        import time

        ttl = self.config.lru_ttl_days * 86400
        last = file_meta.get("last_accessed", 0)
        age = time.time() - last
        return "slow" if age > ttl else "fast"


class ExplicitTierPolicy(TierPolicy):
    """User explicitly sets tier. No automatic migration."""

    def classify(self, filename: str, mime_type: str, tags: list[str] | None = None) -> str:
        return "fast"

    def should_migrate(self, file_meta: dict) -> bool:
        return False

    def target_tier(self, file_meta: dict) -> str:
        return file_meta.get("tier", "fast")


class TagBasedTierPolicy(TierPolicy):
    """Config-driven rules match filename patterns to tiers."""

    DEFAULT_RULES: dict[str, str] = {
        r"\.(gguf|safetensors|bin|pt|pth)$": "slow",
        r"\.(mp4|mov|avi|mkv)$": "slow",
        r"\.(splat|ply)$": "slow",
        r"\.(blend|gltf|glb|obj|stl|dxf|dwg)$": "fast",
        r"\.(xcf|svg|png|jpg|jpeg|md|pdf)$": "fast",
    }

    def __init__(self, config: DepoConfig, rules: dict[str, str] | None = None) -> None:
        super().__init__(config)
        self.rules = rules or self.DEFAULT_RULES

    def classify(self, filename: str, mime_type: str, tags: list[str] | None = None) -> str:
        for pattern, tier in self.rules.items():
            if re.search(pattern, filename, re.IGNORECASE):
                return tier
        return "fast"

    def should_migrate(self, file_meta: dict) -> bool:
        target = self.classify(file_meta.get("filename", ""), file_meta.get("mime_type", ""))
        return file_meta.get("tier") != target

    def target_tier(self, file_meta: dict) -> str:
        return self.classify(file_meta.get("filename", ""), file_meta.get("mime_type", ""))
