import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Flower2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/stores/toast";
import { getToken, getTokenExpiry } from "@/lib/storage";

function BootSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sidebar">
      <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Flower2 className="h-7 w-7" strokeWidth={1.7} />
      </span>
      <div className="text-center">
        <p className="text-sm font-semibold tracking-tight">花屿 Bloom Isle</p>
        <p className="mt-1 text-[11px] tracking-wider text-muted-foreground uppercase">
          Preparing your flowers
        </p>
      </div>
    </div>
  );
}

export function AuthEvents({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (!getToken()) return;
      clearAuth();
      toast.error("登录已过期", "请重新登录后继续操作。");
      if (!location.pathname.startsWith("/login")) {
        const redirect = `${location.pathname}${location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
      }
    };
    window.addEventListener("flower:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("flower:unauthorized", handleUnauthorized);
  }, [clearAuth, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const expiresAt = getTokenExpiry();
    if (!expiresAt) return;
    const delay = expiresAt - Date.now() - 60_000;
    if (delay <= 0) {
      handleExpire();
      return;
    }
    const timer = window.setTimeout(handleExpire, delay);
    return () => window.clearTimeout(timer);

    function handleExpire() {
      if (!getToken()) return;
      clearAuth();
      toast.info("登录状态即将过期", "请重新登录以继续使用花屿。");
      if (!location.pathname.startsWith("/login")) {
        const redirect = `${location.pathname}${location.search}`;
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
      }
    }
  }, [status, clearAuth, navigate, location.pathname, location.search]);

  if (status === "idle" || status === "loading") return <BootSplash />;
  return <>{children}</>;
}
