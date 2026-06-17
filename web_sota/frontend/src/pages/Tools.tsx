import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => r.json())
      .then((d) => {
        setTools(d.tool_surface);
        setFeatures(d.features);
        setInventory(d.inventory);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-depot-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">MCP Inspector</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {(tools?.portmanteau_tools ?? ["depot_management"]).map((t) => (
              <div key={t} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40">
                <Wrench size={18} className="text-depot-400 shrink-0" />
                <div>
                  <p className="text-gray-200 font-medium text-sm">{t}</p>
                  <p className="text-gray-500 text-xs">Portmanteau tool</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">{tools?.total ?? 1} tool(s) registered</p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            <FeatureRow label="Sampling" enabled={features?.sampling ?? false} />
            <FeatureRow label="Agentic Workflows" enabled={features?.agentic_workflows ?? false} />
            <FeatureRow label="Prompts" enabled={features?.prompts ?? false} count={inventory?.prompt_names?.length} />
            <FeatureRow label="Skills" enabled={features?.skills ?? false} count={inventory?.skill_uris?.length} />
            <FeatureRow label="CodeMode" enabled={features?.codemode ?? false} />
          </div>
        </Card>

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
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={enabled ? "text-green-400" : "text-gray-600"}>
        {enabled ? `Enabled${count != null ? ` (${count})` : ""}` : "Disabled"}
      </span>
    </div>
  );
}
