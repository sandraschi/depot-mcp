import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HardDrive, Database, Server, Cpu, Wifi, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DepotStats {
  fast: { used_gb: number; free_gb: number; file_count: number };
  slow: { used_gb: number; free_gb: number; file_count: number };
  total_files: number;
  index: { lancedb_rows: number; fts5_rows: number };
}

interface CapsResponse {
  server: { name: string; version: string; fastmcp: string };
  tool_surface: { total: number; portmanteau_tools: string[] };
  features: { sampling: boolean; agentic_workflows: boolean; skills: boolean };
  inventory: { tier_policies: string[]; search_modes: string[] };
  runtime: { mcp_endpoint: string };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DepotStats | null>(null);
  const [caps, setCaps] = useState<CapsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/v1/depot/stats").then((r) => { if (!r.ok) throw new Error("Stats failed"); return r.json(); }),
      fetch("/api/capabilities").then((r) => { if (!r.ok) throw new Error("Capabilities failed"); return r.json(); }),
    ]).then(([s, c]) => {
      if (s.status === "fulfilled") setStats(s.value);
      if (c.status === "fulfilled") setCaps(c.value);
      if (s.status === "rejected" && c.status === "rejected") {
        setError("Failed to connect to depot backend");
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-depot-400" />
        <span className="ml-3 text-gray-500">Loading depot status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400">
        <AlertCircle size={20} />
        <div>
          <p className="font-medium">Connection Error</p>
          <p className="text-sm text-red-500">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="ml-auto">
          Retry
        </Button>
      </div>
    );
  }

  const totalFastGb = stats ? stats.fast.used_gb + stats.fast.free_gb : 0;
  const totalSlowGb = stats ? stats.slow.used_gb + stats.slow.free_gb : 0;
  const fastPct = totalFastGb > 0 ? ((stats!.fast.used_gb / totalFastGb) * 100).toFixed(1) : "0";
  const slowPct = totalSlowGb > 0 ? ((stats!.slow.used_gb / totalSlowGb) * 100).toFixed(1) : "0";

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Fast Tier (NVMe)</CardTitle>
            <HardDrive className="h-4 w-4 text-depot-400" />
          </CardHeader>
          <div>
            <p className="text-3xl font-bold text-gray-100">{stats ? `${stats.fast.used_gb.toFixed(0)} GB` : "..."}</p>
            <p className="text-xs text-gray-500 mt-1">{fastPct}% used · {stats?.fast.file_count ?? 0} files</p>
            <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-depot-600 rounded-full transition-all duration-500" style={{ width: `${fastPct}%` }} />
            </div>
            <Link to="/stats"><Button variant="ghost" size="sm" className="mt-2 px-0 text-depot-400">View details</Button></Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Slow Tier (HDD)</CardTitle>
            <Database className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <div>
            <p className="text-3xl font-bold text-gray-100">{stats ? `${stats.slow.used_gb.toFixed(0)} GB` : "..."}</p>
            <p className="text-xs text-gray-500 mt-1">{slowPct}% used · {stats?.slow.file_count ?? 0} files</p>
            <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-600 rounded-full transition-all duration-500" style={{ width: `${slowPct}%` }} />
            </div>
            <Link to="/stats"><Button variant="ghost" size="sm" className="mt-2 px-0 text-amber-400">View details</Button></Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Search Index</CardTitle>
            <Database className="h-4 w-4 text-green-400" />
          </CardHeader>
          <div>
            <p className="text-3xl font-bold text-gray-100">{stats ? `${stats.index.lancedb_rows}` : "..."}</p>
            <p className="text-xs text-gray-500 mt-1">LanceDB: {stats?.index.lancedb_rows ?? 0} · FTS5: {stats?.index.fts5_rows ?? 0}</p>
            <p className="text-xs text-gray-600 mt-1">{caps?.inventory?.search_modes?.join(", ") ?? ""} search modes</p>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Files</CardTitle>
            <Server className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <div>
            <p className="text-3xl font-bold text-gray-100">{stats?.total_files ?? "..."}</p>
            <p className="text-xs text-gray-500 mt-1">Across all storage tiers</p>
            <Link to="/browse"><Button variant="ghost" size="sm" className="mt-2 px-0 text-blue-400">Browse files</Button></Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Tier Policy</CardTitle>
            <Cpu className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <div>
            <p className="text-2xl font-bold text-gray-100 capitalize">{caps?.inventory?.tier_policies?.[0] ?? "..."}</p>
            <p className="text-xs text-gray-500 mt-1">Available: {caps?.inventory?.tier_policies?.join(", ") ?? "..."}</p>
            <Link to="/settings"><Button variant="ghost" size="sm" className="mt-2 px-0 text-purple-400">Configure</Button></Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">FastMCP Status</CardTitle>
            <Wifi className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <div>
            <p className="text-lg font-mono text-gray-100 text-sm">{caps?.server?.fastmcp ?? "..."}</p>
            <p className="text-xs text-gray-500 mt-1">
              Sampling: {caps?.features?.sampling ? "Yes" : "No"} · Skills: {caps?.features?.skills ? "Yes" : "No"}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Link to="/upload"><Button>Upload Files</Button></Link>
          <Link to="/search"><Button variant="outline">Search Depot</Button></Link>
          <Link to="/import"><Button variant="outline">Import from Fleet</Button></Link>
          <Link to="/chat"><Button variant="outline">AI Chat</Button></Link>
        </div>
      </Card>
    </div>
  );
}
