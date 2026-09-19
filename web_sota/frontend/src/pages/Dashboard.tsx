import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BarChart3, Cpu, Database, HardDrive, Loader2, Server, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

interface OnboardingState {
  configured: boolean;
  checks: { llm?: { ollama: boolean; lm_studio: boolean } };
  recommended_path: string[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DepotStats | null>(null);
  const [caps, setCaps] = useState<CapsResponse | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/v1/depot/stats").then((r) => {
        if (!r.ok) throw new Error("Stats failed");
        return r.json();
      }),
      fetch("/api/capabilities").then((r) => {
        if (!r.ok) throw new Error("Capabilities failed");
        return r.json();
      }),
      fetch("/api/llm/onboarding").then((r) => (r.ok ? r.json() : null)),
    ]).then(([s, c, o]) => {
      if (s.status === "fulfilled") setStats(s.value);
      if (c.status === "fulfilled") setCaps(c.value);
      if (o.status === "fulfilled" && o.value) setOnboarding(o.value);
      if (s.status === "rejected" && c.status === "rejected") {
        setError("Failed to connect to depot backend");
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="dashboard">
        <Loader2 size={32} className="animate-spin text-depot-400" />
        <span className="ml-3 text-gray-400">Loading depot status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400"
        data-testid="dashboard"
      >
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
  const llmOk = onboarding?.checks?.llm ? onboarding.checks.llm.ollama || onboarding.checks.llm.lm_studio : null;

  return (
    <div data-testid="dashboard">
      {/* Hero: what this is, status, quick-start */}
      <div className="mb-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
        <h1 className="text-2xl font-bold text-gray-100">Fleet File Depot</h1>
        <p className="mt-2 text-sm text-gray-300 max-w-2xl">
          One permanent home for every MCP server&apos;s files: hot data on NVMe, cold data on HDD spinners, hybrid
          vector + keyword search over everything. Upload, browse, migrate tiers, and import fleet depots.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-300">
            <span
              className={`w-2 h-2 rounded-full ${stats ? "bg-green-500" : "bg-red-500"}`}
              data-testid="dashboard-backend-dot"
            />
            Backend {stats ? "connected" : "disconnected"}
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span
              className={`w-2 h-2 rounded-full ${llmOk ? "bg-green-500" : llmOk === false ? "bg-gray-500" : "bg-yellow-500"}`}
            />
            LLM {llmOk ? "available" : llmOk === false ? "not detected" : "probing..."}
          </span>
          <span className="text-gray-400">FastMCP {caps?.server?.fastmcp ?? "..."}</span>
        </div>
        {onboarding && !onboarding.configured && (
          <Link to="/settings" data-testid="onboarding-cue">
            <Button className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white font-semibold" size="lg">
              Complete onboarding - connect tiers + local LLM
            </Button>
          </Link>
        )}
        {onboarding?.configured && llmOk === false && (
          <Link to="/chat" data-testid="onboarding-cue">
            <Button className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white font-semibold" size="lg">
              Complete onboarding - set up a local LLM (Ollama / LM Studio)
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Fast Tier (NVMe)</CardTitle>
            <HardDrive className="h-4 w-4 text-depot-400" />
          </CardHeader>
          <div data-testid="kpi-fast-tier">
            <p className="text-3xl font-bold text-gray-100">{stats ? `${stats.fast.used_gb.toFixed(0)} GB` : "..."}</p>
            <p className="text-sm text-gray-400 mt-1">
              {fastPct}% used · {stats?.fast.file_count ?? 0} files
            </p>
            <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-depot-600 rounded-full transition-all duration-500"
                style={{ width: `${fastPct}%` }}
              />
            </div>
            <Link to="/stats">
              <Button variant="ghost" size="sm" className="mt-2 px-0 text-depot-400">
                View details
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Slow Tier (HDD)</CardTitle>
            <Database className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <div data-testid="kpi-slow-tier">
            <p className="text-3xl font-bold text-gray-100">{stats ? `${stats.slow.used_gb.toFixed(0)} GB` : "..."}</p>
            <p className="text-sm text-gray-400 mt-1">
              {slowPct}% used · {stats?.slow.file_count ?? 0} files
            </p>
            <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-500"
                style={{ width: `${slowPct}%` }}
              />
            </div>
            <Link to="/stats">
              <Button variant="ghost" size="sm" className="mt-2 px-0 text-amber-400">
                View details
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Search Index</CardTitle>
            <Database className="h-4 w-4 text-green-400" />
          </CardHeader>
          <div data-testid="kpi-search-index">
            <p className="text-3xl font-bold text-gray-100">{stats ? `${stats.index.lancedb_rows}` : "..."}</p>
            <p className="text-sm text-gray-400 mt-1">
              LanceDB: {stats?.index.lancedb_rows ?? 0} · FTS5: {stats?.index.fts5_rows ?? 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">{caps?.inventory?.search_modes?.join(", ") ?? ""} search modes</p>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Total Files</CardTitle>
            <Server className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <div data-testid="kpi-total-files">
            <p className="text-3xl font-bold text-gray-100">{stats?.total_files ?? "..."}</p>
            <p className="text-sm text-gray-400 mt-1">Across all storage tiers</p>
            <Link to="/browse">
              <Button variant="ghost" size="sm" className="mt-2 px-0 text-blue-400">
                Browse files
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Tier Policy</CardTitle>
            <Cpu className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <div data-testid="kpi-tier-policy">
            <p className="text-2xl font-bold text-gray-100 capitalize">
              {caps?.inventory?.tier_policies?.[0] ?? "..."}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Available: {caps?.inventory?.tier_policies?.join(", ") ?? "..."}
            </p>
            <Link to="/settings">
              <Button variant="ghost" size="sm" className="mt-2 px-0 text-purple-400">
                Configure
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">FastMCP Status</CardTitle>
            <Wifi className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <div data-testid="kpi-fastmcp">
            <p className="font-mono text-gray-100 text-sm">{caps?.server?.fastmcp ?? "..."}</p>
            <p className="text-sm text-gray-400 mt-1">
              Sampling: {caps?.features?.sampling ? "Yes" : "No"} · Skills: {caps?.features?.skills ? "Yes" : "No"}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3" data-testid="quick-actions">
          <Link to="/upload">
            <Button>Upload Files</Button>
          </Link>
          <Link to="/search">
            <Button variant="outline">Search Depot</Button>
          </Link>
          <Link to="/import">
            <Button variant="outline">Import from Fleet</Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline">AI Chat</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
