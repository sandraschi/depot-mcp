import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

interface Diagnostics {
  version: string;
  fastmcp: string;
  uptime_seconds: number;
  tools: string[];
  ports: { backend: number; frontend: number };
  fleet_errors: { total: number };
}

interface ToolInfo {
  portmanteau_tools: string[];
  total: number;
}

interface FeatureInfo {
  sampling: boolean;
  agentic_workflows: boolean;
  prompts: boolean;
  skills: boolean;
  codemode: boolean;
}

interface PromptInfo {
  prompt_names: string[];
  skill_uris: string[];
}

export default function Tools() {
  const [tools, setTools] = useState<ToolInfo | null>(null);
  const [features, setFeatures] = useState<FeatureInfo | null>(null);
  const [inventory, setInventory] = useState<PromptInfo | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/capabilities").then((r) => r.json()),
      fetch("/api/v1/diagnostics").then((r) => (r.ok ? r.json() : null)),
    ]).then(([caps, diag]) => {
      if (caps.status === "fulfilled") {
        const d = caps.value;
        setTools(d.tool_surface);
        setFeatures(d.features);
        setInventory(d.inventory);
      }
      if (diag.status === "fulfilled" && diag.value) setDiagnostics(diag.value);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-depot-400" />
      </div>
    );
  }

  return (
    <div data-testid="tools-page">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">MCP Inspector</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-100">Tools</CardTitle>
          </CardHeader>
          <div className="space-y-3" data-testid="tools-list">
            {(tools?.portmanteau_tools ?? ["depot_management"]).map((t) => (
              <div key={t} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40">
                <Wrench size={18} className="text-depot-400 shrink-0" />
                <div>
                  <p className="text-gray-200 font-medium text-sm">{t}</p>
                  <p className="text-gray-400 text-sm">Portmanteau tool</p>
                </div>
              </div>
            ))}
            <p className="text-sm text-gray-400" data-testid="tools-count">
              {tools?.total ?? 1} tool(s) registered
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-100">Features</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            <FeatureRow label="Sampling" enabled={features?.sampling ?? false} />
            <FeatureRow label="Agentic Workflows" enabled={features?.agentic_workflows ?? false} />
            <FeatureRow label="Prompts" enabled={features?.prompts ?? false} count={inventory?.prompt_names?.length} />
            <FeatureRow label="Skills" enabled={features?.skills ?? false} count={inventory?.skill_uris?.length} />
            <FeatureRow label="CodeMode" enabled={features?.codemode ?? false} />
          </div>
        </Card>

        {diagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Activity size={16} /> Diagnostics
              </CardTitle>
            </CardHeader>
            <dl className="space-y-2 text-sm" data-testid="diagnostics">
              <div className="flex justify-between">
                <dt className="text-gray-400">Version</dt>
                <dd className="text-gray-200 font-mono">
                  {diagnostics.version} / FastMCP {diagnostics.fastmcp}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Uptime</dt>
                <dd className="text-gray-200 font-mono">{Math.round(diagnostics.uptime_seconds)}s</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Ports</dt>
                <dd className="text-gray-200 font-mono">
                  {diagnostics.ports.backend} / {diagnostics.ports.frontend}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Fleet errors stored</dt>
                <dd className="text-gray-200 font-mono">{diagnostics.fleet_errors.total}</dd>
              </div>
            </dl>
          </Card>
        )}

        {inventory?.prompt_names && inventory.prompt_names.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Prompts</CardTitle>
            </CardHeader>
            <ul className="space-y-1">
              {inventory.prompt_names.map((p) => (
                <li key={p} className="text-sm text-gray-300 font-mono">
                  /prompt {p}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function FeatureRow({ label, enabled, count }: { label: string; enabled: boolean; count?: number }) {
  return (
    <div className="flex items-center justify-between text-sm" data-testid={`feature-${label.toLowerCase()}`}>
      <span className="text-gray-300">{label}</span>
      <span className={enabled ? "text-green-400" : "text-gray-600"}>
        {enabled ? `Enabled${count != null ? ` (${count})` : ""}` : "Disabled"}
      </span>
    </div>
  );
}
