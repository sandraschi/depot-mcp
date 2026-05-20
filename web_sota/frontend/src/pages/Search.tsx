import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBytes, mimeIcon } from "@/lib/utils";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("hybrid");
  const [total, setTotal] = useState(0);

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/depot/search?q=${encodeURIComponent(query)}&limit=20&mode=${mode}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Search Depot</h1>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Search by filename, content, tags..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-depot-500"
          />
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-depot-500"
        >
          <option value="hybrid">Hybrid</option>
          <option value="semantic">Semantic</option>
          <option value="keyword">Keyword</option>
        </select>
        <Button onClick={doSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {total > 0 && <p className="text-gray-500 text-sm mb-4">{total} results</p>}

      <div className="grid gap-3">
        {results.map((r) => (
          <Link
            key={r.file_id}
            to={`/file/${r.file_id}`}
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-800 bg-gray-900/30 hover:bg-gray-800/50 transition-colors"
          >
            <span className="text-2xl">{mimeIcon(r.mime_type || "")}</span>
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 font-medium truncate">{r.filename}</p>
              <p className="text-gray-500 text-xs">
                {r.mime_type} · score: {r.score?.toFixed(3)} · {r.source}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-300 text-sm font-mono">{formatBytes(r.size_bytes || 0)}</p>
              {r.tier && (
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs ${r.tier === "fast" ? "bg-green-900/50 text-green-400" : "bg-amber-900/50 text-amber-400"}`}
                >
                  {r.tier}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {!loading && query && results.length === 0 && (
        <Card className="text-center text-gray-500 py-12 mt-4">
          <p>No results found for "{query}"</p>
        </Card>
      )}
    </div>
  );
}
