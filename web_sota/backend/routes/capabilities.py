"""Capabilities introspection endpoint — fleet standard shape."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

router = APIRouter(tags=["capabilities"])


@router.get("/capabilities")
async def capabilities():
    return {
        "status": "ok",
        "server": {
            "name": "depot-mcp",
            "version": "0.1.0",
            "fastmcp": "3.2.4",
            "runtime": "python",
            "transport": "sse",
            "surface_mode": "portmanteau",
        },
        "tool_surface": {
            "total": 1,
            "portmanteau_count": 1,
            "atomic_count": 0,
            "portmanteau_tools": ["depot_management"],
            "atomic_tools": [],
        },
        "features": {
            "sampling": True,
            "agentic_workflows": True,
            "prompts": True,
            "resources": False,
            "skills": True,
            "codemode": True,
        },
        "inventory": {
            "workflow_tools": ["depot_management"],
            "prompt_names": ["depot_overview", "search_files", "storage_report", "migrate_help"],
            "resource_uris": [],
            "skill_uris": ["skills/depot-management.md"],
            "search_modes": ["hybrid", "semantic", "keyword"],
            "tier_policies": ["lru", "explicit", "tag_based"],
            "importers": ["arxiv", "qcad", "ahk", "generic"],
        },
        "runtime": {
            "transport": "sse",
            "surface_mode": "portmanteau",
            "frontend_port": 10726,
            "backend_port": 10727,
            "mcp_endpoint": "/mcp",
        },
        "llm": {
            "providers": ["ollama", "lm_studio", "openai"],
            "auto_glom": True,
            "default_provider": "ollama",
        },
        "docs": {
            "root": "https://github.com/sandraschi/depot-mcp",
            "install": "docs/install.md",
            "architecture": "docs/architecture.md",
            "usage": "docs/usage.md",
            "mcp_tools": "docs/mcp-tools.md",
            "fleet": "docs/fleet.md",
            "dashboard_help": "/app/help",
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }
