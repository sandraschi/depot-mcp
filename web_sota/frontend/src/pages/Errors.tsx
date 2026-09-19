import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface FleetError {
  ts: string;
  server: string;
  tool: string;
  operation?: string;
  error_type: string;
  message: string;
}

interface ErrorStats {
  total: number;
  by_server: { server: string; count: number }[];
  by_error_type: { error_type: string; count: number }[];
  newest_ts: string | null;
}

export default function Errors() {
  const [rows, setRows] = useState<FleetError[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [server, setServer] = useState("");
  const [tool, setTool] = useState("");
  const [errorType, setErrorType] = useState("");
  const [limit, setLimit] = useState("50");

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (server) q.set("server_name", server);
    if (tool) q.set("tool", tool);
    if (errorType) q.set("error_type", errorType);
    q.set("limit", limit || "50");
    Promise.allSettled([
      fetch(`/api/v1/fleet/errors/query?${q}`).then((r) => (r.ok ? r.json() : { results: [] })),
      fetch("/api/v1/fleet/errors/stats").then((r) => (r.ok ? r.json() : null)),
    ]).then(([query, st]) => {
      if (query.status === "fulfilled") setRows(query.value.results ?? []);
      if (st.status === "fulfilled" && st.value?.data) setStats(st.value.data);
      setLoading(false);
    });
  }, [server, tool, errorType, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const inputCls = "px-3 py-2 bg-zinc-800 text-zinc-100 border border-gray-700 rounded-lg text-sm placeholder-gray-500";

  return (
    <div data-testid="errors-page">
      <h1 className="text-2xl font-bold text-gray-100 mb-2 flex items-center gap-2">
        <TriangleAlert size={22} /> Fleet error telemetry
      </h1>
      <p className="text-sm text-gray-300 mb-6">
        Cross-server failure history — ask why the last attempts failed before retrying blindly.
      </p>

      {stats && (
        <div className="grid gap-4 md:grid-cols-3 mb-6" data-testid="errors-stats">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-300">Total records</CardTitle>
            </CardHeader>
            <p className="text-3xl font-bold text-gray-100">{stats.total}</p>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-300">By server</CardTitle>
            </CardHeader>
            <div className="space-y-1 text-sm">
              {stats.by_server.slice(0, 5).map((s) => (
                <div key={s.server} className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setServer(s.server)}
                    className="text-gray-200 hover:text-depot-400 truncate"
                  >
                    {s.server}
                  </button>
                  <span className="text-gray-400 font-mono">{s.count}</span>
                </div>
              ))}
              {stats.by_server.length === 0 && <p className="text-gray-400">No data yet.</p>}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-300">By error type</CardTitle>
            </CardHeader>
            <div className="space-y-1 text-sm">
              {stats.by_error_type.slice(0, 5).map((t) => (
                <div key={t.error_type} className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setErrorType(t.error_type)}
                    className="text-gray-200 hover:text-depot-400 truncate"
                  >
                    {t.error_type}
                  </button>
                  <span className="text-gray-400 font-mono">{t.count}</span>
                </div>
              ))}
              {stats.by_error_type.length === 0 && <p className="text-gray-400">No data yet.</p>}
            </div>
          </Card>
        </div>
      )}

      <Card className="mb-4">
        <div className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="text-gray-300 text-sm block mb-1" htmlFor="errors-server">
              Server
            </label>
            <input
              id="errors-server"
              data-testid="errors-filter-server"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="windows-computer-use-mcp"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-1" htmlFor="errors-tool">
              Tool
            </label>
            <input
              id="errors-tool"
              data-testid="errors-filter-tool"
              value={tool}
              onChange={(e) => setTool(e.target.value)}
              placeholder="automation_elements"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-1" htmlFor="errors-type">
              Error type
            </label>
            <input
              id="errors-type"
              data-testid="errors-filter-type"
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              placeholder="element_not_found"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-1" htmlFor="errors-limit">
              Limit
            </label>
            <input
              id="errors-limit"
              data-testid="errors-filter-limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={`${inputCls} w-20`}
            />
          </div>
          <Button size="sm" variant="outline" onClick={load} data-testid="errors-refresh">
            Query
          </Button>
          {(server || tool || errorType) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setServer("");
                setTool("");
                setErrorType("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={24} className="animate-spin text-depot-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">No matching records. Quiet skies.</p>
      ) : (
        <div className="space-y-2" data-testid="errors-results">
          {rows.map((e, i) => (
            <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-200 font-medium truncate">
                  {e.server} / {e.tool}
                  {e.operation ? ` / ${e.operation}` : ""}
                </span>
                <span className="ml-auto shrink-0 rounded bg-red-900/40 px-2 py-0.5 text-red-300">{e.error_type}</span>
              </div>
              <div className="text-sm text-gray-400 truncate">{e.message}</div>
              <div className="text-sm text-gray-500 font-mono">{e.ts}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
