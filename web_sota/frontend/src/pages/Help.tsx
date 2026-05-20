import { useState } from "react";
import { Card } from "@/components/ui/card";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "install", label: "Install" },
  { id: "architecture", label: "Architecture" },
  { id: "usage", label: "Usage" },
  { id: "mcp-tools", label: "MCP Tools" },
  { id: "fleet", label: "Fleet" },
  { id: "api", label: "API Reference" },
];

export default function Help() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Documentation</h1>
      <p className="text-gray-500 text-sm mb-6">depot-mcp — Fleet File Depot v0.1.0</p>

      <div className="flex gap-1 mb-6 border-b border-gray-800 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors border-b-2 ${
              activeTab === t.id
                ? "border-depot-500 text-depot-400 bg-depot-600/10"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-6 text-gray-300 text-sm leading-relaxed">
        {activeTab === "overview" && <TabOverview />}
        {activeTab === "install" && <TabInstall />}
        {activeTab === "architecture" && <TabArchitecture />}
        {activeTab === "usage" && <TabUsage />}
        {activeTab === "mcp-tools" && <TabMCPTools />}
        {activeTab === "fleet" && <TabFleet />}
        {activeTab === "api" && <TabAPI />}
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-100 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs font-mono text-gray-400 overflow-x-auto my-2">
      {code}
    </pre>
  );
}

function TabOverview() {
  return (
    <div>
      <Section title="What is depot-mcp?">
        <p className="mb-2">
          Centralized fleet file depot with tiered NVMe/spinner storage, LanceDB vector search,
          and SQLite FTS5 sidecar. Every MCP server in the fleet has its own ad-hoc depot;
          depot-mcp unifies them on Goliath PC.
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
          <li><strong className="text-gray-200">Tiered Storage:</strong> Hot files on NVMe, cold files on HDD, auto-migration</li>
          <li><strong className="text-gray-200">Dual Search:</strong> LanceDB (semantic) + SQLite FTS5 (keyword) in one query</li>
          <li><strong className="text-gray-200">Fleet Native:</strong> Import from arxiv, qcad, autohotkey, blender, gimp</li>
          <li><strong className="text-gray-200">Multiple Access:</strong> REST API, MCP tools, SMB share</li>
        </ul>
      </Section>

      <Section title="Quick Start">
        <CodeBlock code={`git clone https://github.com/sandraschi/depot-mcp.git
cd depot-mcp
.\\web_sota\\start.bat`}
        />
        <p className="text-gray-500">Opens the dashboard at <strong>http://127.0.0.1:10726</strong></p>
      </Section>

      <Section title="Ports">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-depot-400">10726</p>
            <p className="text-xs text-gray-500">Frontend (Vite)</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-depot-400">10727</p>
            <p className="text-xs text-gray-500">Backend + MCP</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function TabInstall() {
  return (
    <div>
      <Section title="Prerequisites">
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Python 3.12+</li>
          <li><strong>uv</strong> (package manager)</li>
          <li>Node.js (LTS) — for the web dashboard</li>
          <li>Windows — SMB share requires PowerShell admin</li>
        </ul>
      </Section>

      <Section title="Setup">
        <p className="mb-1">1. Clone and install Python deps:</p>
        <CodeBlock code={`git clone https://github.com/sandraschi/depot-mcp.git
cd depot-mcp
uv sync`} />

        <p className="mb-1 mt-3">2. Install frontend deps:</p>
        <CodeBlock code={`cd web_sota\\frontend
npm install
cd ..\\..`} />

        <p className="mb-1 mt-3">3. Create storage directories:</p>
        <CodeBlock code={`New-Item -ItemType Directory -Path D:\\depot\\fast -Force
New-Item -ItemType Directory -Path E:\\depot\\slow -Force`} />
      </Section>

      <Section title="Running Modes">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">Mode</th><th className="text-left py-2">Command</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">Full Stack</td><td className="py-2 font-mono text-xs text-gray-400">.\web_sota\start.bat</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">MCP Stdio</td><td className="py-2 font-mono text-xs text-gray-400">uv run depot-mcp --transport stdio</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">MCP SSE</td><td className="py-2 font-mono text-xs text-gray-400">uv run depot-mcp --transport sse --port 10727</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">Agentic</td><td className="py-2 font-mono text-xs text-gray-400">uv run depot-mcp --transport sse --port 10727 --agentic</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Environment Variables">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">Variable</th><th className="text-left py-2">Default</th><th className="text-left py-2">Description</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-800"><td className="py-2 font-mono text-xs text-gray-200">DEPOT_FAST_ROOT</td><td className="py-2 text-xs text-gray-400">D:\depot\fast</td><td className="py-2 text-xs text-gray-400">Fast tier root</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 font-mono text-xs text-gray-200">DEPOT_SLOW_ROOT</td><td className="py-2 text-xs text-gray-400">E:\depot\slow</td><td className="py-2 text-xs text-gray-400">Slow tier root</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 font-mono text-xs text-gray-200">DEPOT_TIER_POLICY</td><td className="py-2 text-xs text-gray-400">lru</td><td className="py-2 text-xs text-gray-400">lru | explicit | tag_based</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 font-mono text-xs text-gray-200">DEPOT_MCP_LLM_GLOM</td><td className="py-2 text-xs text-gray-400">1</td><td className="py-2 text-xs text-gray-400">Auto-detect Ollama</td></tr>
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function TabArchitecture() {
  return (
    <div>
      <Section title="Component Overview">
        <p className="mb-2">depot-mcp runs on Goliath PC with these layers:</p>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-400 mb-4 whitespace-pre">
{`┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  React/Vite   │◄──►│   FastAPI REST   │◄──►│  FastMCP     │
│  Dashboard    │    │   (:10727)       │    │  SSE /stdio  │
│  (:10726)     │    │                  │    │              │
└──────────────┘    └───────┬───────────┘    └──────────────┘
                            │
               ┌────────────┼──────────────┐
        ┌──────▼──────┐ ┌───▼────┐ ┌───────▼───────┐
        │  TierManager │ │FileStor│ │ SearchService │
        │  LRU/Exp/Tag │ │NVMe+HDD│ │ LanceDB+FTS5  │
        └──────────────┘ └────────┘ └───────────────┘`}
        </div>
      </Section>

      <Section title="Storage Tiers">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">Tier</th><th className="text-left py-2">Drives</th><th className="text-left py-2">Media</th><th className="text-left py-2">Default Path</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-800"><td className="py-2 text-green-400">fast</td><td className="py-2 font-mono text-xs">C:, D:, N:</td><td className="py-2 text-xs">NVMe/SSD</td><td className="py-2 font-mono text-xs text-gray-400">D:\depot\fast\</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-amber-400">slow</td><td className="py-2 font-mono text-xs">E:, F:, ...</td><td className="py-2 text-xs">HDD</td><td className="py-2 font-mono text-xs text-gray-400">E:\depot\slow\</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Search Engines">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="font-semibold text-gray-200 mb-1">LanceDB (Vector)</p>
            <p className="text-xs text-gray-400">Model: bge-small-en-v1.5 (384d)</p>
            <p className="text-xs text-gray-400">Use: Semantic similarity</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="font-semibold text-gray-200 mb-1">SQLite FTS5 (Keyword)</p>
            <p className="text-xs text-gray-400">Scoring: BM25</p>
            <p className="text-xs text-gray-400">Use: Exact keyword match</p>
          </div>
        </div>
      </Section>

      <Section title="Tier Policies">
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-gray-200">LRU</strong> (default): Auto-evict cold files to slow tier after 7 days</li>
          <li><strong className="text-gray-200">Explicit</strong>: User declares tier, no auto-migration</li>
          <li><strong className="text-gray-200">Tag-based</strong>: Rules match filename patterns (e.g. *.gguf→slow)</li>
        </ul>
      </Section>
    </div>
  );
}

function TabUsage() {
  return (
    <div>
      <Section title="Uploading Files">
        <p className="mb-1">Via Dashboard — drag-and-drop or click to browse.</p>
        <p className="mb-1">Via REST API:</p>
        <CodeBlock code={`curl -X POST http://127.0.0.1:10727/api/v1/depot/upload ^
  -F "file=@model.blend" ^
  -F "tier=fast" ^
  -F "tags=project-x,3d,blender"`} />
        <p className="mb-1">Via MCP Tool:</p>
        <CodeBlock code={`depot_management(action="upload", filename="model.blend", tier="fast", tags=["project-x"])`} />
      </Section>

      <Section title="Searching">
        <p className="mb-1">Three search modes:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400 mb-3">
          <li><strong className="text-gray-200">hybrid</strong> (default): Both vector + keyword, merged</li>
          <li><strong className="text-gray-200">semantic</strong>: LanceDB vector only</li>
          <li><strong className="text-gray-200">keyword</strong>: FTS5 exact match only</li>
        </ul>
        <CodeBlock code={`curl "http://127.0.0.1:10727/api/v1/depot/search?q=blender+cad&tier=fast&limit=10&mode=hybrid"`} />
      </Section>

      <Section title="Migrating Between Tiers">
        <CodeBlock code={`curl -X POST http://127.0.0.1:10727/api/v1/depot/migrate ^
  -H "Content-Type: application/json" ^
  -d '{"file_id": "uuid-here", "target_tier": "slow"}'`} />
      </Section>

      <Section title="AI Chat (Ollama)">
        <p className="text-gray-400">
          If Ollama is running on Goliath, the Chat page enables natural-language queries:
          "How much space is on the fast tier?", "Find Blender files tagged project-x".
        </p>
      </Section>
    </div>
  );
}

function TabMCPTools() {
  return (
    <div>
      <Section title="depot_management (Portmanteau)">
        <p className="mb-2">All depot operations go through this single portmanteau tool with 7 actions:</p>
        <table className="w-full text-sm border-collapse mb-4">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">Action</th><th className="text-left py-2">Parameters</th><th className="text-left py-2">Description</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-800"><td className="py-2 text-green-400">upload</td><td className="py-2 font-mono text-xs text-gray-400">filename, file_data_b64, tier, tags</td><td className="py-2 text-xs text-gray-400">Upload a file</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-blue-400">download</td><td className="py-2 font-mono text-xs text-gray-400">file_id</td><td className="py-2 text-xs text-gray-400">Download file (base64)</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-blue-400">search</td><td className="py-2 font-mono text-xs text-gray-400">query, mime_type, tags, limit, search_mode</td><td className="py-2 text-xs text-gray-400">Search files</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-purple-400">stats</td><td className="py-2 font-mono text-xs text-gray-400">(none)</td><td className="py-2 text-xs text-gray-400">Storage statistics</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-amber-400">migrate</td><td className="py-2 font-mono text-xs text-gray-400">file_id, tier</td><td className="py-2 text-xs text-gray-400">Move between tiers</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-red-400">delete</td><td className="py-2 font-mono text-xs text-gray-400">file_id</td><td className="py-2 text-xs text-gray-400">Delete file</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">tag</td><td className="py-2 font-mono text-xs text-gray-400">file_id, tags</td><td className="py-2 text-xs text-gray-400">Update tags</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Prompts">
        <p className="mb-2">4 native FastMCP 3.2+ prompts:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-gray-200">depot_overview</strong> — Summary of depot stats</li>
          <li><strong className="text-gray-200">search_files</strong> — Search by name/type/content</li>
          <li><strong className="text-gray-200">storage_report</strong> — Full storage report</li>
          <li><strong className="text-gray-200">migrate_help</strong> — Tier migration recommendations</li>
        </ul>
      </Section>

      <Section title="Skills">
        <p className="text-gray-400">
          A <strong>depot-management</strong> skill is registered via SkillsDirectoryProvider,
          covering upload, search, tier management, and fleet import patterns.
        </p>
      </Section>

      <Section title="Agentic Mode">
        <p className="mb-1">Start with <code className="text-depot-400">--agentic</code> to enable:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>CodeMode BM25 tool discovery</li>
          <li>LLM-in-the-loop sampling via <code className="text-depot-400">ctx.sample()</code></li>
          <li>Context-aware session management</li>
        </ul>
      </Section>
    </div>
  );
}

function TabFleet() {
  return (
    <div>
      <Section title="Importing Existing Depots">
        <p className="mb-2">Available importers:</p>
        <table className="w-full text-sm border-collapse mb-4">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">Source</th><th className="text-left py-2">Files</th><th className="text-left py-2">Path Hint</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">arxiv</td><td className="py-2 text-xs">.md</td><td className="py-2 font-mono text-xs text-gray-400">D:\Dev\repos\arxiv-mcp\data\arxiv_mcp\markdown\</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">qcad</td><td className="py-2 text-xs">.dxf, .dwg</td><td className="py-2 font-mono text-xs text-gray-400">%LOCALAPPDATA%\qcad-mcp\depot\</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">ahk</td><td className="py-2 text-xs">.ahk</td><td className="py-2 font-mono text-xs text-gray-400">D:\Dev\repos\autohotkey-test\scriptlets\</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">generic</td><td className="py-2 text-xs">all</td><td className="py-2 font-mono text-xs text-gray-400">user-specified</td></tr>
          </tbody>
        </table>
        <CodeBlock code={`curl -X POST http://127.0.0.1:10727/api/v1/depot/import ^
  -H "Content-Type: application/json" ^
  -d '{"source":"arxiv","source_path":"D:\\Dev\\repos\\arxiv-mcp\\data\\arxiv_mcp\\markdown\\"}'`} />
      </Section>

      <Section title="Connecting Other Servers">
        <p className="mb-2">Fleet servers can access depot-mcp via:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong className="text-gray-200">REST API</strong>: POST/GET to <code className="text-depot-400">http://goliath:10727/api/v1/depot/*</code></li>
          <li><strong className="text-gray-200">MCP Tools</strong>: Call <code className="text-depot-400">depot_management</code> via FastMCP client</li>
          <li><strong className="text-gray-200">SMB Share</strong>: Mount <code className="text-depot-400">\\goliath\depot</code> for direct read access</li>
        </ul>
      </Section>

      <Section title="Migration Strategy">
        <ol className="list-decimal list-inside space-y-1 text-gray-400">
          <li>Set up depot-mcp on Goliath PC</li>
          <li>Import existing arxiv, qcad, ahk depots</li>
          <li>Point fleet servers to depot-mcp for new files</li>
          <li>Decommission per-server depots when ready</li>
        </ol>
      </Section>
    </div>
  );
}

function TabAPI() {
  return (
    <div>
      <Section title="REST Endpoints">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b border-gray-800 text-gray-400"><th className="text-left py-2">Method</th><th className="text-left py-2">Path</th><th className="text-left py-2">Description</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-800"><td className="py-2 text-green-400">POST</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/upload</td><td className="py-2 text-xs text-gray-400">Multipart file upload</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-blue-400">GET</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/download/{id}</td><td className="py-2 text-xs text-gray-400">Stream file download</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-blue-400">GET</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/search</td><td className="py-2 text-xs text-gray-400">Search with q, tier, type, mode filters</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-gray-200">GET</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/stats</td><td className="py-2 text-xs text-gray-400">Storage usage statistics</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-red-400">DELETE</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/files/{id}</td><td className="py-2 text-xs text-gray-400">Delete file</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-yellow-400">PATCH</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/files/{id}</td><td className="py-2 text-xs text-gray-400">Update tags/tier</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-purple-400">POST</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/migrate</td><td className="py-2 text-xs text-gray-400">Trigger tier migration</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-orange-400">POST</td><td className="py-2 font-mono text-xs text-gray-200">/api/v1/depot/import</td><td className="py-2 text-xs text-gray-400">Import from fleet depot</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-blue-400">GET</td><td className="py-2 font-mono text-xs text-gray-200">/api/capabilities</td><td className="py-2 text-xs text-gray-400">Service capabilities</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-blue-400">GET</td><td className="py-2 font-mono text-xs text-gray-200">/api/llm/providers</td><td className="py-2 text-xs text-gray-400">List LLM providers</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-blue-400">GET</td><td className="py-2 font-mono text-xs text-gray-200">/api/llm/models</td><td className="py-2 text-xs text-gray-400">List available models</td></tr>
            <tr className="border-b border-gray-800"><td className="py-2 text-green-400">POST</td><td className="py-2 font-mono text-xs text-gray-200">/api/llm/chat</td><td className="py-2 text-xs text-gray-400">Send chat message</td></tr>
            <tr className="border-b"><td className="py-2 text-blue-400">GET</td><td className="py-2 font-mono text-xs text-gray-200">/mcp</td><td className="py-2 text-xs text-gray-400">FastMCP SSE endpoint</td></tr>
          </tbody>
        </table>
      </Section>
    </div>
  );
}
