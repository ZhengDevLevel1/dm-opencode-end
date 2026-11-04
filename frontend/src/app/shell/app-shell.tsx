import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useUiStore } from "@/stores/ui";
import { PageLoading } from "@/components/ui/page-loading";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PageTransition } from "./page-transition";
import { CommandMenu } from "@/components/ui/command-menu";
import { Toaster } from "@/components/ui/toast";

export function AppShell() {
  const pinned = useUiStore((state) => state.sidebarPinned);
  const setPinned = useUiStore((state) => state.setSidebarPinned);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setPinned(!pinned);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pinned, setPinned, setCommandOpen]);

  return (
    <div className="flex h-dvh w-full max-w-full overflow-hidden bg-sidebar text-foreground">
      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-2xl md:shadow-[0_0_18px_-6px_rgb(0_0_0/0.14)]">
        <div className="app-background pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
        <Topbar />
        <main className="app-canvas relative z-[1] min-h-0 flex-1 overflow-y-auto bg-transparent">
          <div className="relative z-[1] mx-auto w-full max-w-[1600px] px-4 py-5 md:px-6 md:py-6 lg:px-8">
            <PageTransition>
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </div>
        </main>
      </div>

      <CommandMenu />
      <Toaster />
    </div>
  );
}
