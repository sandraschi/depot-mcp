"""FastMCP 3.2+ native prompts for depot-mcp."""

import logging

from fastmcp import FastMCP
from fastmcp.prompts import Message

logger = logging.getLogger(__name__)


def depot_overview() -> Message:
    """Summarize the depot: files, tier usage, and connected fleet servers."""
    return Message("Give me an overview of the fleet depot: file count, tier usage, and connected servers.")


def search_files() -> Message:
    """Search files in the depot by name, type, or content."""
    return Message("Search the fleet depot for a specific file. Include filename patterns, file types, or tags.")


def storage_report() -> Message:
    """Generate a storage usage report with tier breakdown."""
    return Message(
        "Generate a storage report for the depot. Show fast vs slow tier usage, file type distribution, and migration recommendations."
    )


def migrate_help() -> Message:
    """Help migrating files between storage tiers."""
    return Message(
        "I need help managing storage tiers. Show me which files are candidates for migration between fast (NVMe) and slow (HDD) tiers."
    )


def register_prompts(mcp: FastMCP) -> None:
    """Register all SOTA prompts with the FastMCP instance."""
    mcp.add_prompt(depot_overview)
    mcp.add_prompt(search_files)
    mcp.add_prompt(storage_report)
    mcp.add_prompt(migrate_help)
    logger.info("Registered %s depot-mcp prompts", 4)
