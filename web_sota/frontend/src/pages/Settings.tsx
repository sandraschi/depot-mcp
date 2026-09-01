import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Download, HardDrive, Loader2, Upload } from "lucide-react";
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

interface DepotEntry {
  depot: string;
  path: string;
  files?: number;
  mb?: number;
  sub?: string;
  note?: string;
  derivative?: string;
}

function BackupCard() {
  const [depots, setDepots] = useState<DepotEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [advDepot, setAdvDepot] = useState("");
  const [advPath, setAdvPath] = useState("");

  const load = () => {
    fetch("/api/backup/list")
      .then((r) => r.json())
      .then((d) => setDepots(d.depots || []))
      .catch(() => setStatus("Failed to list depots — is depot-mcp running on 10727?"));
    // also try fleet advertised for context
    fetch("/api/fleet/advertised")
      .then((r) => r.json())
      .then((d) => {
        if (d.advertised?.length) setStatus(`Advertised: ${d.advertised.map((a: DepotEntry) => a.depot).join(", ")} — plus discovered manifests`);
      })
      .catch(() => {});
  };
  useEffect(load, []);

  const doBackup = async (depot: string) => {
    setBusy(depot);
    setStatus(`Zipping ${depot}…`);
    try {
      const res = await fetch(`/api/backup/backup?depot=${encodeURIComponent(depot)}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${depot}-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${depot} — db/vectors are derivatives, vault zip is sufficient.`);
    } catch (e) {
      setStatus(`Backup failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(null); }
  };

  const doRestore = async (depot: string, file: File) => {
    setBusy(depot);
    setStatus(`Restoring ${depot} from ${file.name}…`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/backup/restore?depot=${encodeURIComponent(depot)}`, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setStatus(`Restored ${depot} — backup saved at ${j.backup}. Vectors will re-embed on next sync.`);
      load();
    } catch (e) {
      setStatus(`Restore failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(null); }
  };

  const doAdvertise = async () => {
    if (!advDepot || !advPath) { setStatus("Need depot name and path"); return; }
    setBusy("advertise");
    try {
      const res = await fetch("/api/fleet/advertise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ depot: advDepot, path: advPath }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setStatus(`Advertised ${advDepot} → ${advPath}`);
      setAdvDepot(""); setAdvPath("");
      load();
    } catch (e) { setStatus(`Advertise failed: ${e instanceof Error ? e.message : String(e)}`); } finally { setBusy(null); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><HardDrive size={16} /> Fleet Depot Backup <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/20">vault = source</span></CardTitle></CardHeader>
      <div className="space-y-3 text-sm">
        <div className="text-xs text-gray-400">
          <b className="text-gray-200">vault/*.md</b> (memops) is source — <b>memory.db + vectors/</b> are derivatives (re-embed after restore). Maker depots (<code>blender-mcp/depot</code>, <code>gimp-mcp/data</code>, …) are zipped whole. Repos advertise via <code>POST /api/fleet/advertise</code> or <code>.depot.json</code> manifest; depot-mcp consumes and stores in <code>data/advertised_depots.json</code> (scan is fallback).
        </div>
        <div className="grid gap-2">
          {depots.length === 0 ? <div className="text-xs text-gray-500">No depots found — advertise one below or check D:/Dev/repos scan.</div> : depots.map((d) => (
            <div key={d.depot + d.path} className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900 p-2">
              <div className="flex-1 min-w-0"><div className="font-mono text-xs truncate">{d.depot} <span className="text-gray-500">— {d.path}</span></div><div className="text-[11px] text-gray-500">{d.files ?? "?"} files · {d.mb ?? "?"} MB {d.derivative ? "· derivative" : ""} {d.note ? `· ${d.note}` : ""}</div></div>
              <Button size="sm" variant="outline" onClick={() => doBackup(d.depot)} disabled={!!busy} data-testid={`backup-${d.depot}`}><Download size={14} /> {busy === d.depot ? "..." : "Backup"}</Button>
              <label className={`inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs cursor-pointer hover:bg-zinc-800 ${busy ? "opacity-40 pointer-events-none" : ""}`}><Upload size={14} /> Restore<input type="file" accept=".zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doRestore(d.depot, f); e.currentTarget.value = ""; }} disabled={!!busy} /></label>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t border-zinc-800">
          <input placeholder="depot name (e.g. blender-mcp)" value={advDepot} onChange={(e) => setAdvDepot(e.target.value)} className="flex-1 rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs" />
          <input placeholder="path (e.g. D:/Dev/repos/blender-mcp/depot)" value={advPath} onChange={(e) => setAdvPath(e.target.value)} className="flex-[2] rounded bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs" />
          <Button size="sm" onClick={doAdvertise} disabled={!!busy || !advDepot || !advPath}>Advertise</Button>
        </div>
        <div className="text-[11px] text-gray-500">Manifest alternative: drop <code>.depot.json</code> in repo root: <code>{"{"}"depot":"my-maker","path":"depot","tags":["blend"]{"}"}</code> — auto-discovered on next <code>/api/backup/list</code>.</div>
        {status && <div className="text-xs text-gray-400 bg-zinc-900 rounded px-3 py-2 border border-zinc-800">{status}</div>}
      </div>
    </Card>
  );
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
        <BackupCard />
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
