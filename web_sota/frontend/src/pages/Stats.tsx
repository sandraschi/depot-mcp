import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Database, HardDrive } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DepotStats {
  fast: { used_gb: number; free_gb: number; file_count: number };
  slow: { used_gb: number; free_gb: number; file_count: number };
  total_files: number;
  index: { lancedb_rows: number; fts5_rows: number };
}

export default function Stats() {
  const [stats, setStats] = useState<DepotStats | null>(null);

  useEffect(() => {
    fetch("/api/v1/depot/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <div className="text-gray-500 animate-pulse">Loading stats...</div>;
  }

  const tierData = [
    { name: "Fast Used", value: stats.fast.used_gb },
    { name: "Fast Free", value: stats.fast.free_gb },
  ];
  const slowData = [
    { name: "Slow Used", value: stats.slow.used_gb },
    { name: "Slow Free", value: stats.slow.free_gb },
  ];
  const COLORS = ["#1a6de8", "#1e293b"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Depot Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={HardDrive} label="Total Files" value={stats.total_files.toString()} />
        <StatCard
          icon={HardDrive}
          label="Fast Tier"
          value={`${stats.fast.used_gb.toFixed(0)} / ${(stats.fast.used_gb + stats.fast.free_gb).toFixed(0)} GB`}
        />
        <StatCard
          icon={HardDrive}
          label="Slow Tier"
          value={`${stats.slow.used_gb.toFixed(0)} / ${(stats.slow.used_gb + stats.slow.free_gb).toFixed(0)} GB`}
        />
        <StatCard icon={Database} label="Indexed" value={`${stats.index.lancedb_rows} / ${stats.index.fts5_rows}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fast Tier (NVMe)</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={tierData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-gray-500 text-sm">{stats.fast.file_count} files</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Slow Tier (HDD)</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={slowData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {slowData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-gray-500 text-sm">{stats.slow.file_count} files</p>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3">
      <Icon size={24} className="text-depot-400" />
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-gray-200 font-mono text-lg">{value}</p>
      </div>
    </Card>
  );
}
