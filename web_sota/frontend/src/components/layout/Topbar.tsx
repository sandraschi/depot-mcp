import { Cpu, Server, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
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
  "/errors": "Fleet Errors",
  "/import": "Import from Fleet",
  "/settings": "Settings",
  "/inbox": "Inbox",
  "/skills": "Skills",
  "/logs": "Logs",
};

const BACKOFFS = [1000, 2000, 4000, 8000, 16000];

export default function Topbar({ eventStatus }: { eventStatus?: string | null }) {
  const location = useLocation();
  const title = TITLE_MAP[location.pathname] ?? "depot-mcp";
  const [online, setOnline] = useState<boolean | null>(null);
  const [version, setVersion] = useState("v0.1.0");

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const poll = async () => {
      try {
        const r = await fetch("/api/capabilities");
        if (!cancelled && r.ok) {
          const caps = await r.json();
          setOnline(true);
          if (caps?.server?.version) setVersion(`v${caps.server.version}`);
          attempt = 0;
          return;
        }
      } catch {
        /* retry with backoff */
      }
      if (cancelled) return;
      setOnline(false);
      const wait = BACKOFFS[Math.min(attempt, BACKOFFS.length - 1)];
      attempt += 1;
      setTimeout(poll, wait);
    };
    void poll();
    const id = setInterval(() => {
      attempt = 0;
      void poll();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const effective = eventStatus === "ready" ? true : eventStatus?.startsWith("error") ? false : online;

  return (
    <header className="h-12 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl flex items-center justify-between px-4 z-40">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-100">{title}</h1>
        <span className="text-sm text-gray-500 font-mono">{location.pathname}</span>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span className="flex items-center gap-1">
          <Cpu size={12} /> 10727
        </span>
        <span className="flex items-center gap-1">
          <Server size={12} /> {version}
        </span>
        <span
          className={`flex items-center gap-1 ${effective ? "text-green-500" : effective === false ? "text-red-500" : "text-gray-500"}`}
          data-testid="backend-dot"
        >
          <Wifi size={12} /> {effective ? "Online" : effective === false ? "Offline" : "Probing"}
        </span>
      </div>
    </header>
  );
}
