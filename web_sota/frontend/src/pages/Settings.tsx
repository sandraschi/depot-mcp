import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CapsResponse {
  status: string;
  server: { name: string; version: string; fastmcp: string };
  tool_surface: { total: number; portmanteau_count: number; atomic_count: number; portmanteau_tools: string[] };
  features: { sampling: boolean; agentic_workflows: boolean; prompts: boolean; skills: boolean; codemode: boolean };
  inventory: {
    prompt_names: string[];
    skill_uris: string[];
    search_modes: string[];
    tier_policies: string[];
    importers: string[];
  };
  runtime: { transport: string; surface_mode: string; mcp_endpoint: string };
  llm: { providers: string[]; auto_glom: boolean };
  timestamp: string;
}

export default function Settings() {
  const [caps, setCaps] = useState<CapsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((d) => {
        setCaps(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-depot-400" />
        <span className="ml-3 text-gray-500">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400">
        <AlertCircle size={20} />
        <div>
          <p className="font-medium">Error</p>
          <p className="text-sm text-red-500">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="ml-auto">
          Retry
        </Button>
      </div>
    );
  }

  if (!caps) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Settings</h1>
      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Server</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={caps.server.name} />
            <Row label="Version" value={caps.server.version} />
            <Row label="FastMCP" value={caps.server.fastmcp} />
            <Row label="Transport" value={caps.runtime.transport} />
            <Row label="Surface Mode" value={caps.runtime.surface_mode} />
            <Row label="MCP Endpoint" value={caps.runtime.mcp_endpoint} />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tool Surface</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Total Tools" value={String(caps.tool_surface.total)} />
            <Row
              label="Portmanteau"
              value={`${caps.tool_surface.portmanteau_count} (${caps.tool_surface.portmanteau_tools.join(", ")})`}
            />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Sampling" value={caps.features.sampling ? "Enabled" : "Disabled"} />
            <Row label="Agentic Workflows" value={caps.features.agentic_workflows ? "Enabled" : "Disabled"} />
            <Row
              label="Prompts"
              value={caps.features.prompts ? `${caps.inventory.prompt_names.length} registered` : "None"}
            />
            <Row
              label="Skills"
              value={caps.features.skills ? `${caps.inventory.skill_uris.length} registered` : "None"}
            />
            <Row label="CodeMode" value={caps.features.codemode ? "Available" : "Not available"} />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Modes" value={caps.inventory.search_modes.join(", ")} />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Tier Policies" value={caps.inventory.tier_policies.join(", ")} />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LLM</CardTitle>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Providers" value={caps.llm.providers.join(", ")} />
            <Row label="Auto-Discovery" value={caps.llm.auto_glom ? "Enabled (17434, 1234)" : "Disabled"} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-300 text-right max-w-[60%] truncate">{value}</dd>
    </div>
  );
}
