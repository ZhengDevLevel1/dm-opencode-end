export type WorkbenchKey = "mall" | "staff" | "admin";

export type WorkbenchRoutes = Partial<Record<WorkbenchKey, string>>;

const STORAGE_KEY = "flower.workbench.last";
const WORKBENCH_KEYS: WorkbenchKey[] = ["mall", "staff", "admin"];

export function readWorkbenchRoutes(): WorkbenchRoutes {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const record = parsed as Record<string, unknown>;
    const routes: WorkbenchRoutes = {};
    for (const key of WORKBENCH_KEYS) {
      const value = record[key];
      if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
        routes[key] = value;
      }
    }
    return routes;
  } catch {
    return {};
  }
}

export function getWorkbenchRoute(key: WorkbenchKey): string | null {
  return readWorkbenchRoutes()[key] ?? null;
}

export function rememberWorkbenchRoute(key: WorkbenchKey, pathname: string): void {
  if (typeof window === "undefined") return;
  const routes = readWorkbenchRoutes();
  if (routes[key] === pathname) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...routes, [key]: pathname }),
    );
  } catch {
    return;
  }
}

export function clearWorkbenchRoutes(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
