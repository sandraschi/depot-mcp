import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: string;
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [provider, setProvider] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  async function loadProviders() {
    const r = await fetch("/api/llm/providers");
    const data = await r.json();
    if (data.success && data.providers?.length) {
      const names = data.providers.map((p: { type?: string }) => p.type ?? "");
      setProviders(names);
      if (names.length > 0) setProvider(names[0]);
    }
  }

  async function loadModels() {
    if (!provider) return;
    const r = await fetch(`/api/llm/models?provider=${encodeURIComponent(provider)}`);
    const data = await r.json();
    if (data.success && data.models?.length) {
      setModels(data.models.map((m: { name: string }) => m.name));
    }
  }

  async function loadModel() {
    if (!model || !provider) return;
    await fetch("/api/llm/models/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_name: model, provider }),
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          provider: provider || undefined,
          stream: false,
          model: model || undefined,
        }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        const content = data.message?.content || "(no response)";
        setMessages((m) => [...m, { role: "assistant", content }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `Error: ${data.error || "unknown"}` }]);
      }
    } catch (err: unknown) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Network error: ${err instanceof Error ? err.message : "connection failed"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">AI Chat</h1>

      <div className="flex gap-4 mb-4 flex-wrap">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModels([]);
            }}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm"
          >
            {providers.length === 0 && <option value="">No providers found</option>}
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Model</label>
          <div className="flex gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 text-sm"
              onClick={loadModels}
              onFocus={loadModels}
            >
              {models.length === 0 && <option value="">Select model</option>}
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={loadModel}>
              Load
            </Button>
          </div>
        </div>
      </div>

      <Card className="flex-1 overflow-y-auto mb-4 p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Bot size={48} className="mx-auto mb-4 text-gray-700" />
              <p className="text-lg">Ask the AI about your depot</p>
              <p className="text-sm mt-1">
                e.g. &quot;How much space is used?&quot; or &quot;Find my Blender files&quot;
              </p>
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

      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about files, storage, or fleet depots..."
          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:border-depot-500"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? <span className="animate-pulse">...</span> : <Send size={18} />}
        </Button>
      </form>
    </div>
  );
}
