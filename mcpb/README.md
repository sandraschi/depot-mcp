# schip-mcp-depot (MCPB Bundle)

Centralized fleet file depot — tiered NVMe/spinner storage with LanceDB vector search and SQLite FTS5 sidecar

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "schip-mcp-depot": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "schip_mcp_depot"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **depot_management**: depot_management
- **register_depot_tool_upload**: register_depot_tool(upload)
- **register_depot_tool_download**: register_depot_tool(download)
- **register_depot_tool_search**: register_depot_tool(search)
- **register_depot_tool_stats**: register_depot_tool(stats)
- **register_depot_tool_migrate**: register_depot_tool(migrate)
- **register_depot_tool_delete**: register_depot_tool(delete)
- **register_depot_tool_tag**: register_depot_tool(tag)

## Requirements

- Python 3.12+
- uv
