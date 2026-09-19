import { create } from "zustand";

export interface DiscoveredProvider {
  type: string;
  detected: boolean;
  latency_ms: number;
  registered: boolean;
  default_url: string;
  free: boolean;
}

interface LlmState {
  providers: DiscoveredProvider[];
  gpuDetected: boolean;
  gpuName: string | null;
  provider: string;
  model: string;
  models: string[];
  probing: boolean;
  setProviders: (p: DiscoveredProvider[]) => void;
  setGpuDetected: (detected: boolean, name: string | null) => void;
  setProvider: (p: string) => void;
  setModel: (m: string) => void;
  discover: () => Promise<void>;
  loadModels: () => Promise<void>;
}

function saved(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export const useLlmStore = create<LlmState>((set, get) => ({
  providers: [],
  gpuDetected: false,
  gpuName: null,
  provider: saved("llm_provider"),
  model: saved("llm_model"),
  models: [],
  probing: false,

  setProviders: (providers) => set({ providers }),
  setGpuDetected: (gpuDetected, gpuName) => set({ gpuDetected, gpuName }),

  setProvider: (provider) => {
    try {
      localStorage.setItem("llm_provider", provider);
    } catch {
      /* private mode */
    }
    set({ provider, models: [] });
    void get().loadModels();
  },
  setModel: (model) => {
    try {
      localStorage.setItem("llm_model", model);
    } catch {
      /* private mode */
    }
    set({ model });
  },

  discover: async () => {
    set({ probing: true });
    try {
      const r = await fetch("/api/llm/discover");
      if (!r.ok) return;
      const data = await r.json();
      const providers: DiscoveredProvider[] = data.providers ?? [];
      set({ providers });
      if (data.gpu) set({ gpuDetected: !!data.gpu.present, gpuName: data.gpu.name ?? null });
      const detected = providers.filter((p) => p.detected).map((p) => p.type);
      const current = get().provider;
      if (!current && detected.length > 0) get().setProvider(detected[0]);
      else if (current) void get().loadModels();
    } catch {
      /* backend down - pages show their own error states */
    } finally {
      set({ probing: false });
    }
  },

  loadModels: async () => {
    const { provider } = get();
    if (!provider) return;
    try {
      const r = await fetch(`/api/llm/models?provider=${encodeURIComponent(provider)}`);
      const data = await r.json();
      if (data.success && Array.isArray(data.models)) {
        set({ models: data.models.map((m: { name: string }) => m.name) });
      }
    } catch {
      set({ models: [] });
    }
  },
}));
