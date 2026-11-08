import { useId, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ChevronsRight, Flower2, Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { useUiStore } from "@/stores/ui";
import { useCartQuery, useFavoritesQuery } from "@/hooks/queries";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { staffService } from "@/lib/services";
import { canSeeRole, navGroups, resolveWorkbench, workbenches } from "./nav";
import { Button } from "@/components/ui/button";

function useBadgeCounts() {
  const user = useAuthStore((state) => state.user);
  const authenticated = Boolean(user);
  const isStaff = user?.role === "STAFF" || user?.role === "ADMIN";
  const cart = useCartQuery(authenticated);
  const favorites = useFavoritesQuery(authenticated);
  const pending = useQuery({
    queryKey: queryKeys.staffOrders({ page: 1, size: 1, status: "PAID" }),
    queryFn: () => staffService.orders({ page: 1, size: 1, status: "PAID" }),
    enabled: authenticated && isStaff,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  return {
    cart: cart.data?.reduce((total, item) => total + item.quantity, 0) ?? 0,
    favorites: favorites.data?.length ?? 0,
    pending: pending.data?.total ?? 0,
  };
}

function Brand({ expanded }: { expanded: boolean }) {
  return (
    <div className="flex h-16 shrink-0 items-center px-2">
      <span className="grid w-12 shrink-0 place-items-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Flower2 className="h-5 w-5" strokeWidth={1.8} />
        </span>
      </span>
      <div
        className={cn(
          "min-w-0 transition-opacity duration-200",
          expanded ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold tracking-tight">花屿</span>
          <span className="font-mono-ui text-[10px] text-muted-foreground">v1.0</span>
        </div>
        <p className="truncate text-[11px] text-muted-foreground">Bloom Isle</p>
      </div>
    </div>
  );
}

function WorkbenchSwitch({ expanded }: { expanded: boolean }) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const switchId = useId();
  const links = useMemo(
    () => workbenches.filter((item) => canSeeRole(user?.role, item.roles)),
    [user?.role],
  );
  if (!user || links.length <= 1) return null;

  const current = resolveWorkbench(location.pathname);
  const next = links[(links.findIndex((link) => resolveWorkbench(link.to) === current) + 1) % links.length];

  return (
    <div className="px-2 pb-3">
      {expanded ? (
        <LayoutGroup id={`workbench-switch-${switchId}`}>
          <div className="flex rounded-lg bg-sidebar-accent/60 p-0.5">
            {links.map((link) => {
              const key = resolveWorkbench(link.to);
              const active = current === key;
              return (
                <button
                  key={link.to}
                  type="button"
                  onClick={() => navigate(link.to)}
                  className={cn(
                    "relative flex-1 cursor-pointer rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId={`workbench-switch-pill-${switchId}`}
                      className="absolute inset-0 rounded-md bg-card shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span className="relative z-10">{link.label}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      ) : (
        <button
          type="button"
          onClick={() => navigate(next?.to ?? "/")}
          className="flex h-9 w-12 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent/40"
          aria-label={next ? `切换到${next.label}` : "切换工作台"}
          title={next ? `切换到${next.label}` : "切换工作台"}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SidebarContent({
  expanded,
  mobile,
  onNavigate,
}: {
  expanded: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const counts = useBadgeCounts();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotionSetting = useThemeStore((state) => state.reduceMotion);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(reduceMotionSetting || prefersReducedMotion);
  const workbench = resolveWorkbench(location.pathname);

  const groups = navGroups.filter((group) => {
    if (group.workbench !== workbench) return false;
    if (group.roles && !canSeeRole(user?.role, group.roles)) return false;
    if (group.auth && !user) return false;
    return true;
  });
  const layoutKey = `sidebar-${mobile ? "mobile" : "desktop"}-${workbench}`;

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between">
        <Brand expanded={expanded} />
        {mobile ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="关闭菜单"
            onClick={onNavigate}
            className="mr-2"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <WorkbenchSwitch expanded={expanded} />

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4" aria-label="主导航">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={workbench}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
            }
          >
            <LayoutGroup id={layoutKey}>
              {groups.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
              {expanded ? (
                <p className="mb-1.5 px-2 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  {group.label}
                </p>
              ) : (
                <div className="mb-2 ml-2 h-px w-10 bg-sidebar-border" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.match
                    ? item.match(location.pathname)
                    : location.pathname === item.to;
                  const badge =
                    item.badge === "cart"
                      ? counts.cart
                      : item.badge === "favorites"
                        ? counts.favorites
                        : item.badge === "pending"
                          ? counts.pending
                          : 0;
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      title={expanded ? undefined : `${item.label} · ${item.description}`}
                      onClick={() => {
                        if (mobile) onNavigate?.();
                        if (
                          item.to === "/staff/orders" &&
                          location.pathname.startsWith("/staff/orders")
                        ) {
                          navigate("/staff/orders");
                        }
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex w-full items-center rounded-lg py-2 text-left outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/40",
                        isActive
                          ? "text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground",
                      )}
                    >
                      {isActive ? (
                        <>
                          <motion.span
                            aria-hidden
                            layoutId={`${layoutKey}-active-pill`}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className={cn(
                              "absolute top-0 bottom-0 rounded-lg bg-sidebar-accent",
                              expanded ? "inset-x-0" : "left-0.5 w-11",
                            )}
                          />
                          {expanded ? (
                            <motion.span
                              aria-hidden
                              layoutId={`${layoutKey}-active-bar`}
                              transition={{ type: "spring", stiffness: 380, damping: 32 }}
                              className="absolute top-1/2 left-0 z-10 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                            />
                          ) : null}
                        </>
                      ) : null}
                      <span className="relative z-10 grid w-12 shrink-0 place-items-center">
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] transition-colors duration-150",
                            isActive ? "text-primary" : "",
                          )}
                          strokeWidth={1.9}
                        />
                        {!expanded && badge > 0 ? (
                          <span className="absolute -top-1.5 right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold text-primary-foreground tabular">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "relative z-10 flex min-w-0 flex-1 flex-col items-start overflow-hidden pr-3 transition-opacity duration-200",
                          expanded ? "opacity-100" : "opacity-0",
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{item.label}</span>
                          {badge > 0 ? (
                            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary/12 px-1 text-[10px] font-semibold text-primary tabular">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block w-full truncate text-[11px] text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </NavLink>
                  );
                  return link;
                })}
              </div>
            </div>
              ))}
            </LayoutGroup>
          </motion.div>
        </AnimatePresence>
      </nav>
      <SidebarFooter expanded={expanded} />
    </div>
  );
}

function SidebarFooter({ expanded }: { expanded: boolean }) {
  const pinned = useUiStore((state) => state.sidebarPinned);
  const setPinned = useUiStore((state) => state.setSidebarPinned);
  return (
    <div className="shrink-0 border-t border-sidebar-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            "min-w-0 transition-opacity duration-200",
            expanded ? "opacity-100" : "opacity-0",
          )}
        >
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Bloom Isle · 花店管理
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">© 2026 花屿</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={pinned ? "取消固定侧栏" : "固定侧栏"}
          aria-pressed={pinned}
          title={pinned ? "取消固定侧栏" : "固定侧栏"}
          onClick={() => setPinned(!pinned)}
          className={cn(pinned && "text-primary")}
        >
          {pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pinned = useUiStore((state) => state.sidebarPinned);
  const mobileOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileOpen = useUiStore((state) => state.setMobileNavOpen);
  const reduceMotionSetting = useThemeStore((state) => state.reduceMotion);
  const prefersReducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const reduceMotion = Boolean(reduceMotionSetting || prefersReducedMotion);
  const collapsed = !pinned && !hovered && !focusWithin;

  return (
    <>
      <motion.aside
        aria-label="侧栏"
        initial={false}
        animate={{ width: collapsed ? 64 : 248 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 0.26,
                ease: [0.4, 0, 0.1, 1],
              }
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={(event) => {
          if ((event.target as Element).matches(":focus-visible")) {
            setFocusWithin(true);
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocusWithin(false);
          }
        }}
        className="relative z-30 hidden h-full shrink-0 overflow-hidden border-r border-sidebar-border md:block"
      >
        <div className="h-full w-[248px]">
          <SidebarContent expanded={!collapsed} />
        </div>
      </motion.aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fade-in absolute inset-0 bg-foreground/25 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="slide-in-left relative h-full w-[264px] border-r border-sidebar-border shadow-2xl">
            <SidebarContent expanded mobile onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
