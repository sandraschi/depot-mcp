import { Card } from "@/components/ui/card";
import { formatBytes, formatDate, mimeIcon } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface DepotFile {
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  tier: string;
  tags: string[];
  created_at?: number;
}

export default function Browse() {
  const [files, setFiles] = useState<DepotFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/depot/files?limit=50")
      .then((r) => r.json())
      .then((data) => setFiles(data.results || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-500 animate-pulse">Loading depot contents...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Depot Browse</h1>
        <span className="text-gray-500 text-sm">{files.length} files</span>
      </div>

      {files.length === 0 ? (
        <Card className="text-center text-gray-500 py-12">
          <p className="text-lg mb-2">Depot is empty</p>
          <p className="text-sm">Upload files to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {files.map((f) => (
            <Link
              key={f.file_id}
              to={`/file/${f.file_id}`}
              className="flex items-center gap-4 p-4 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-2xl">{mimeIcon(f.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 font-medium truncate">{f.filename}</p>
                <p className="text-gray-500 text-xs">{f.mime_type}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-300 text-sm font-mono">{formatBytes(f.size_bytes)}</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${f.tier === "fast" ? "bg-green-900/50 text-green-400" : "bg-amber-900/50 text-amber-400"}`}
                >
                  {f.tier}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
