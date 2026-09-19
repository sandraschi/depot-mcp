import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLlmStore } from "@/store/llm";
import { Bot, Download, Eraser, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: string;
  content: string;
}

interface Personality {
  id: string;
  label: string;
  prompt: string;
}

const HISTORY_KEY = "depot-mcp-chat-history";
const PERSONALITY_KEY = "depot-mcp-chat-personality";
const CUSTOM_KEY = "depot-mcp-chat-custom";
const HISTORY_CAP = 100;

const PERSONALITIES: Personality[] = [
  {
    id: "librarian",
    label: "Depot Librarian",
    prompt: "You are the Depot Librarian. Answer precisely about files, tiers, and search. Cite file names and tiers.",
  },
  {
    id: "strategist",
    label: "Tier Strategist",
    prompt:
      "You are the Tier Strategist. Advise on fast (NVMe) vs slow (HDD) placement, LRU policy, and migration candidates. Be concrete with GB and file counts.",
  },
  {
    id: "importer",
    label: "Import Guide",
    prompt:
      "You are the Import Guide. Help the user import fleet depots (arxiv, qcad, ahk, generic) and explain dry-run results before they commit.",
  },
  { id: "custom", label: "Custom", prompt: "" },
];

const EXAMPLES = [
  "How much space is used on each tier?",
  "Find my Blender files",
  "Which files should migrate to the slow tier?",
  "How do I import the arxiv depot?",
  "What importers are available?",
  "Explain the tier policies",
];

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-HISTORY_CAP) : [];
  } catch {
    return [];
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [personality, setPersonality] = useState(() => {
    try {
      return localStorage.getItem(PERSONALITY_KEY) ?? "librarian";
    } catch {
      return "librarian";
    }
  });
  const [customPrompt, setCustomPrompt] = useState(() => {
    try {
      return localStorage.getItem(CUSTOM_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [skillContent, setSkillContent] = useState("");
  const [skillName, setSkillName] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerUp, setProviderUp] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { providers, provider, model, models, setProvider, setModel, discover, loadModels } = useLlmStore();

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only bootstrap
  useEffect(() => {
    void discover();
    fetch("/api/skills")
      .then((r) => (r.ok ? r.json() : { skills: [] }))
      .then((d) => {
        const first = d.skills?.[0];
        if (first?.content) {
          setSkillContent(first.content);
          setSkillName(first.name);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: must re-run on messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_CAP)));
    } catch {
      /* private mode */
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(PERSONALITY_KEY, personality);
    } catch {
      /* private mode */
    }
  }, [personality]);

  function buildSystemPrompt(): string {
    const base = skillContent || "You are the depot-mcp assistant.";
    if (personality === "custom") return customPrompt || base;
    const p = PERSONALITIES.find((x) => x.id === personality);
    return `${base}\n\n---\n\n## Role\n${p?.prompt ?? ""}`;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const next = [...messages, userMsg].slice(-HISTORY_CAP);
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/llm/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: buildSystemPrompt() },
            ...next.map((m) => ({ role: m.role, content: m.content })),
          ],
          provider: provider || undefined,
          model: model || undefined,
        }),
      });
      if (!r.ok || !r.body) {
        const err = await r.json().catch(() => ({ detail: r.statusText }));
        setProviderUp(false);
        setMessages((m) => [...m, { role: "assistant", content: `Error: ${err.detail || err.error || "unknown"}` }]);
        return;
      }
      setProviderUp(true);
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta) {
              acc += data.delta;
              const snapshot = acc;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: snapshot };
                return copy;
              });
            }
          } catch {
            /* partial chunk - keep buffering */
          }
        }
      }
    } catch (err: unknown) {
      setProviderUp(false);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Network error: ${err instanceof Error ? err.message : "connection failed"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function doExport() {
    const text = messages.map((m) => `[${m.role}] ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `depot-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doClear() {
    setMessages([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* private mode */
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]" data-testid="chat-page">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">AI Chat</h1>
      {skillName && (
        <p className="text-sm text-gray-400 mb-3">
          Skill-first: <span className="text-depot-400 font-mono">{skillName}</span> loaded as base prompt
        </p>
      )}

      <div className="flex gap-4 mb-4 flex-wrap items-end" data-testid="chat-controls">
        <div>
          <label className="text-gray-300 text-sm block mb-1" htmlFor="chat-personality">
            Personality
          </label>
          <select
            id="chat-personality"
            data-testid="personality-select"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm"
          >
            {PERSONALITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {personality === "custom" && (
          <div className="flex-1 min-w-48">
            <label className="text-gray-300 text-sm block mb-1" htmlFor="chat-custom">
              Custom prompt
            </label>
            <input
              id="chat-custom"
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                try {
                  localStorage.setItem(CUSTOM_KEY, e.target.value);
                } catch {
                  /* private mode */
                }
              }}
              placeholder="Full system prompt (replaces skill+role)"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm"
            />
          </div>
        )}
        <div>
          <label className="text-gray-300 text-sm block mb-1" htmlFor="chat-provider">
            Provider{" "}
            <span
              className={`inline-block w-2 h-2 rounded-full ml-1 ${
                providerUp === null ? "bg-gray-500" : providerUp ? "bg-green-500" : "bg-red-500"
              }`}
              title={providerUp === null ? "unknown" : providerUp ? "reachable" : "down"}
            />
          </label>
          <select
            id="chat-provider"
            data-testid="llm-provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm"
          >
            {providers.length === 0 && <option value="">No providers found</option>}
            {providers.map((p) => (
              <option key={p.type} value={p.type}>
                {p.type}
                {p.detected ? "" : " (offline)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-gray-300 text-sm block mb-1" htmlFor="chat-model">
            Model
          </label>
          <select
            id="chat-model"
            data-testid="llm-model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            onClick={() => void loadModels()}
            onFocus={() => void loadModels()}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm"
          >
            {models.length === 0 && <option value="">Select model</option>}
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={doExport}
            disabled={messages.length === 0}
            data-testid="chat-export"
          >
            <Download size={14} /> Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={doClear}
            disabled={messages.length === 0}
            data-testid="chat-clear"
          >
            <Eraser size={14} /> Clear
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-y-auto mb-4 p-4" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Bot size={48} className="mx-auto mb-4 text-gray-700" />
              <p className="text-lg">Ask the AI about your depot</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-xl" data-testid="example-prompts">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setInput(ex)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-300 hover:border-depot-500 hover:text-gray-100"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                m.role === "user" ? "bg-depot-600 text-white" : "bg-gray-800 text-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </Card>

      <form onSubmit={(e) => void send(e)} className="flex gap-2">
        <input
          type="text"
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about files, storage, or fleet depots..."
          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-depot-500"
          disabled={loading}
        />
        <Button type="submit" data-testid="chat-send" disabled={loading || !input.trim()}>
          {loading ? <span className="animate-pulse">...</span> : <Send size={18} />}
        </Button>
      </form>
    </div>
  );
}
