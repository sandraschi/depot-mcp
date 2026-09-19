import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Loader2, MessagesSquare } from "lucide-react";
import { useEffect, useState } from "react";

interface Skill {
  name: string;
  uri: string;
  content: string;
}

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/skills").then((r) => (r.ok ? r.json() : { skills: [] })),
      fetch("/api/capabilities").then((r) => (r.ok ? r.json() : null)),
    ]).then(([s, c]) => {
      if (s.status === "fulfilled") setSkills(s.value.skills ?? []);
      if (c.status === "fulfilled" && c.value?.inventory?.prompt_names) {
        setPrompts(c.value.inventory.prompt_names);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="skills-page">
        <Loader2 size={32} className="animate-spin text-depot-400" />
        <span className="ml-3 text-gray-400">Loading skills...</span>
      </div>
    );
  }

  return (
    <div data-testid="skills-page">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Skills</h1>
      <p className="text-sm text-gray-300 mb-6">
        Agent skills served by this depot. Chat loads the first skill as its base prompt.
      </p>
      <div className="grid gap-4" data-testid="skills-list">
        {skills.length === 0 && <p className="text-sm text-gray-400">No skills registered.</p>}
        {skills.map((s) => (
          <Card key={s.uri}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <BookOpen size={16} /> {s.name}
                <span className="ml-auto font-mono text-sm text-gray-500">{s.uri}</span>
              </CardTitle>
            </CardHeader>
            <button
              type="button"
              onClick={() => setOpen(open === s.uri ? null : s.uri)}
              className="text-sm text-depot-400 hover:text-depot-300"
              data-testid={`skill-toggle-${s.name}`}
            >
              {open === s.uri ? "Hide content" : "Show content"}
            </button>
            {open === s.uri && (
              <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-gray-950 border border-gray-800 p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap">
                {s.content}
              </pre>
            )}
          </Card>
        ))}
      </div>
      <h2 className="text-xl font-bold text-gray-100 mt-8 mb-3 flex items-center gap-2">
        <MessagesSquare size={18} /> Prompt templates
      </h2>
      <div className="flex flex-wrap gap-2" data-testid="prompts-list">
        {prompts.map((p) => (
          <span key={p} className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-300 font-mono">
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
