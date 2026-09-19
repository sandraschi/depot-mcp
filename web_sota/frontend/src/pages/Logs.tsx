import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ScrollText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface LogRow {
  ts: string;
  level: string;
  logger: string;
  message: string;
}

const LEVELS = ["", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

const LEVEL_COLOR: Record<string, string> = {
  DEBUG: "text-gray-500",
  INFO: "text-blue-400",
  WARNING: "text-amber-400",
  ERROR: "text-red-400",
  CRITICAL: "text-red-300 font-bold",
};

export default function Logs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const q = level ? `?level=${encodeURIComponent(level)}&limit=200` : "?limit=200";
    fetch(`/api/v1/logs${q}`)
      .then((r) => (r.ok ? r.json() : { results: [], total: 0 }))
      .then((d) => {
        setRows(d.results ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [level]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onToggle = () => load();
    window.addEventListener("fleet:toggle-logger", onToggle);
    return () => window.removeEventListener("fleet:toggle-logger", onToggle);
  }, [load]);

  return (
    <div data-testid="logs-page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ScrollText size={22} /> Backend logs
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            In-memory ring buffer (last {total} entries). Tip: Ctrl+L refreshes from anywhere.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-300" htmlFor="logs-level">
            Level
          </label>
          <select
            id="logs-level"
            data-testid="logs-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === "" ? "All" : l}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={load} data-testid="logs-refresh">
            Refresh
          </Button>
        </div>
      </div>
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-depot-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 p-2">No log entries yet. Backend logs appear here as they happen.</p>
        ) : (
          <pre
            className="max-h-[60vh] overflow-auto text-xs font-mono leading-relaxed text-gray-300"
            data-testid="logs-output"
          >
            {rows.map((r, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span className="text-gray-500">{r.ts}</span>{" "}
                <span className={LEVEL_COLOR[r.level] ?? "text-gray-300"}>{r.level.padEnd(8)}</span>{" "}
                <span className="text-gray-500">{r.logger}</span> {r.message}
              </div>
            ))}
          </pre>
        )}
      </Card>
    </div>
  );
}
