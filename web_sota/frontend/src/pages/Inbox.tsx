import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface DepotFile {
  file_id: string;
  filename: string;
  tier: string;
  size_bytes: number;
  created_at?: number;
}

interface FleetError {
  ts: string;
  server: string;
  tool: string;
  error_type: string;
  message: string;
}

export default function Inbox() {
  const [files, setFiles] = useState<DepotFile[]>([]);
  const [errors, setErrors] = useState<FleetError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      fetch("/api/v1/depot/files?limit=20").then((r) => {
        if (!r.ok) throw new Error("files failed");
        return r.json();
      }),
      fetch("/api/v1/fleet/errors/query?limit=20").then((r) => (r.ok ? r.json() : { results: [] })),
    ]).then(([f, e]) => {
      if (f.status === "fulfilled") setFiles(f.value.results ?? []);
      else setError("Failed to connect to depot backend");
      if (e.status === "fulfilled") setErrors(e.value.results ?? []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="inbox-page">
        <Loader2 size={32} className="animate-spin text-depot-400" />
        <span className="ml-3 text-gray-400">Loading inbox...</span>
      </div>
    );
  }

  return (
    <div data-testid="inbox-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Inbox</h1>
          <p className="text-sm text-gray-300 mt-1">Fresh arrivals and fleet signals needing attention.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} data-testid="inbox-refresh">
          Refresh
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-3 p-4 mb-4 rounded-xl bg-red-900/20 border border-red-800/50 text-red-400">
          <AlertCircle size={20} />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-100">
              <FileUp size={16} /> Recent uploads
            </CardTitle>
          </CardHeader>
          <div className="space-y-2" data-testid="inbox-files">
            {files.length === 0 && <p className="text-sm text-gray-400">No files yet. Upload one to get started.</p>}
            {files.map((f) => (
              <Link
                key={f.file_id}
                to={`/file/${f.file_id}`}
                className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 hover:border-gray-700"
              >
                <span className="text-sm text-gray-200 truncate flex-1">{f.filename}</span>
                <span className="text-sm text-gray-400">{(f.size_bytes / 1024).toFixed(1)} KB</span>
                <span className="text-sm text-depot-400">{f.tier}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-100">
              <TriangleAlert size={16} /> Fleet error signals
            </CardTitle>
          </CardHeader>
          <div className="space-y-2" data-testid="inbox-errors">
            {errors.length === 0 && <p className="text-sm text-gray-400">No fleet errors recorded. Quiet skies.</p>}
            {errors.map((e, i) => (
              <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2">
                <div className="text-sm text-gray-200 truncate">
                  {e.server} / {e.tool} - {e.error_type}
                </div>
                <div className="text-sm text-gray-400 truncate">{e.message}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
