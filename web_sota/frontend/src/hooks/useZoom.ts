import { useCallback, useEffect, useState } from "react";

const LEVELS = [0.5, 0.6, 0.7, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0];
const KEY = "tauri-zoom";

function loadIndex(): number {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const idx = LEVELS.indexOf(Number.parseFloat(saved));
      if (idx >= 0) return idx;
    }
  } catch {
    /* private mode */
  }
  return LEVELS.indexOf(1.0);
}

async function applyLevel(level: number): Promise<void> {
  try {
    const mod = await import("@tauri-apps/api/webview");
    await (mod as unknown as { setZoom: (n: number) => Promise<void> }).setZoom(level);
    return;
  } catch {
    /* not in Tauri - fall through to CSS zoom */
  }
  (document.documentElement.style as unknown as { zoom: string }).zoom = String(level);
}

/** Ctrl+Scroll zoom with Ctrl+0 reset, persisted to localStorage. */
export function useZoom() {
  const [index, setIndex] = useState(loadIndex);
  const level = LEVELS[index];

  useEffect(() => {
    void applyLevel(level);
    try {
      localStorage.setItem(KEY, String(level));
    } catch {
      /* private mode */
    }
  }, [level]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setIndex((i) => Math.min(LEVELS.length - 1, Math.max(0, i + (e.deltaY < 0 ? 1 : -1))));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        setIndex(LEVELS.indexOf(1.0));
      }
      if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
        window.dispatchEvent(new CustomEvent("fleet:toggle-logger"));
      }
      if (e.ctrlKey && (e.key === "h" || e.key === "H")) {
        window.dispatchEvent(new CustomEvent("fleet:toggle-help"));
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const reset = useCallback(() => setIndex(LEVELS.indexOf(1.0)), []);
  return { level, percent: Math.round(level * 100), reset };
}
