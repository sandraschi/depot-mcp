"""Depot configuration and drive discovery.

[RATIONALE]: Centralized config with auto-drive-scanning avoids hardcoded paths
that break when drive letters change.
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _discover_drives() -> dict[str, list[str]]:
    """Scan available drives by checking drive letters (fast, no hang)."""
    import string

    fast: list[str] = []
    slow: list[str] = []
    for letter in string.ascii_uppercase:
        d = f"{letter}:\\"
        if os.path.exists(d):
            if letter in ("C", "D", "N"):
                fast.append(f"{letter}:")
            else:
                slow.append(f"{letter}:")
    return {"fast": sorted(fast), "slow": sorted(slow)}


class DepoConfig(BaseSettings):
    """Configuration for depot-mcp."""

    model_config = SettingsConfigDict(env_prefix="DEPOT_", env_file=".env", extra="ignore")

    fast_root: Path = Field(
        default_factory=lambda: Path(os.environ.get("DEPOT_FAST_ROOT", "D:\\depot\\fast")),
        description="Root directory for fast-tier (NVMe) storage.",
    )
    slow_root: Path = Field(
        default_factory=lambda: Path(os.environ.get("DEPOT_SLOW_ROOT", "E:\\depot\\slow")),
        description="Root directory for slow-tier (HDD) storage.",
    )
    lancedb_path: Path = Field(
        default_factory=lambda: Path("data/lancedb"),
        description="Path to LanceDB directory.",
    )
    fts_db_path: Path = Field(
        default_factory=lambda: Path("data/depot_fts.db"),
        description="Path to SQLite FTS5 sidecar database.",
    )
    data_dir: Path = Field(
        default_factory=lambda: Path("data"),
        description="Data directory for all depot files.",
    )

    tier_policy: str = Field(
        default="lru",
        description="Active tiering policy: lru, explicit, or tag_based.",
    )
    lru_ttl_days: int = Field(
        default=7,
        ge=1,
        description="Days before a file is considered cold for LRU eviction.",
    )
    chunk_size_mb: int = Field(
        default=64,
        ge=1,
        le=1024,
        description="Chunk size in MB for large file uploads.",
    )
    max_upload_size_gb: int = Field(
        default=100,
        ge=1,
        description="Maximum allowed upload size in GB.",
    )

    host: str = Field(default="127.0.0.1", description="Server bind host.")
    port: int = Field(default=10727, description="Server bind port.")
    frontend_port: int = Field(default=10726, description="Frontend dev server port.")

    embedding_model: str = Field(
        default="BAAI/bge-small-en-v1.5",
        description="fastembed model name for vector embeddings.",
    )
    embedding_dim: int = Field(default=384, description="Embedding vector dimension.")

    @field_validator("fast_root", "slow_root", mode="before")
    @classmethod
    def ensure_dirs(cls, v: Path) -> Path:
        v.mkdir(parents=True, exist_ok=True)
        return v

    @property
    def drives(self) -> dict[str, list[str]]:
        return _discover_drives()

    @classmethod
    def from_yaml(cls, path: str | Path) -> DepoConfig:
        with open(path) as f:
            data = yaml.safe_load(f) or {}
        return cls(**data)

    @classmethod
    def from_env(cls) -> DepoConfig:
        return cls()
