import { Cpu, Server, Wifi } from "lucide-react";
import { useLocation } from "react-router-dom";

const TITLE_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/browse": "Browse Depot",
  "/search": "Search",
  "/upload": "Upload",
  "/stats": "Statistics",
  "/chat": "AI Chat",
  "/help": "Documentation",
  "/tools": "MCP Inspector",
  "/import": "Import from Fleet",
  "/settings": "Settings",
};

export default function Topbar() {
  const location = useLocation();
  const title = TITLE_MAP[location.pathname] ?? "depot-mcp";

  return (
    <header className="h-12 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl flex items-center justify-between px-4 z-40">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-100">{title}</h1>
        <span className="text-xs text-gray-600 font-mono">{location.pathname}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Cpu size={12} /> 10727
        </span>
        <span className="flex items-center gap-1">
          <Server size={12} /> v0.1.0
        </span>
        <span className="flex items-center gap-1 text-green-500">
          <Wifi size={12} /> Online
        </span>
      </div>
    </header>
  );
}
