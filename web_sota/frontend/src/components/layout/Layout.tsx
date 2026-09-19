import { useZoom } from "@/hooks/useZoom";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [backendEvent, setBackendEvent] = useState<string | null>(null);
  const { percent } = useZoom();

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      try {
        const mod = await import("@tauri-apps/api/event");
        unlisten = await (
          mod as unknown as { listen: (e: string, h: (ev: { payload: string }) => void) => Promise<() => void> }
        ).listen("backend-status", (event) => setBackendEvent(String(event.payload)));
      } catch {
        /* not in Tauri - Topbar HTTP polling covers status */
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} zoomPercent={percent} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar eventStatus={backendEvent} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
