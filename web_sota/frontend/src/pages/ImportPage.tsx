import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageOpen } from "lucide-react";
import { useState } from "react";

const SOURCES = [
  { id: "arxiv", label: "arxiv-mcp", desc: "Markdown papers from arxiv-mcp FTS5 corpus" },
  { id: "qcad", label: "qcad-mcp", desc: "DXF/DWG CAD files with metadata sidecars" },
  { id: "ahk", label: "autohotkey-mcp", desc: ".ahk scriptlet files" },
  { id: "generic", label: "Generic Directory", desc: "Import all files from any directory" },
];

export default function ImportPage() {
  const [source, setSource] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function doImport() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/depot/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, source_path: sourcePath, dry_run: dryRun }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Import from Fleet Depot</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {SOURCES.map((s) => (
          <Card
            key={s.id}
            className={`cursor-pointer transition-colors ${source === s.id ? "border-depot-500 bg-depot-600/10" : "hover:border-gray-700"}`}
            onClick={() => setSource(s.id)}
          >
            <div className="flex items-center gap-3">
              <PackageOpen size={20} className={source === s.id ? "text-depot-400" : "text-gray-600"} />
              <div>
                <p className="text-gray-200 font-medium">{s.label}</p>
                <p className="text-gray-500 text-xs">{s.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {source && (
        <Card>
          <CardHeader>
            <CardTitle>Import from: {SOURCES.find((s) => s.id === source)?.label}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Source Path</label>
              <input
                type="text"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder={`e.g. D:\\Dev\\repos\\${source}-mcp\\data\\`}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-gray-300 text-sm">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded"
                />
                Dry run (scan only)
              </label>
              <Button onClick={doImport} disabled={loading || !sourcePath}>
                {loading ? "Processing..." : dryRun ? "Scan" : "Import"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-4">
          <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
