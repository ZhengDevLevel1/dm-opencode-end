import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flower2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
  Sun,
  UserRound,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { useThemeStore } from "@/stores/theme";
import { useResolvedDark } from "@/app/providers/theme-provider";
import { useCartQuery, useFavoritesQuery } from "@/hooks/queries";
import { queryKeys } from "@/lib/query-keys";
import { staffService } from "@/lib/services";
import { runWithThemeTransition, nextThemeMode } from "@/lib/theme-transition";
import { toast } from "@/stores/toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/domain/user-avatar";
import { Badge } from "@/components/ui/badge";
import { getRouteMeta } from "./nav";

function IconBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground tabular">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setTheme = useThemeStore((state) => state.set);
  const resolvedDark = useResolvedDark();
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

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

  const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
  const Icon = meta.icon;
  const cartCount = cart.data?.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const favoriteCount = favorites.data?.length ?? 0;
  const pendingCount = pending.data?.total ?? 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      setUpdatedAt(new Date());
      toast.success("已刷新", "数据已更新到最新状态。");
    } finally {
      window.setTimeout(() => setRefreshing(false), 400);
    }
  };

  const handleThemeToggle = () => {
    const next = nextThemeMode(resolvedDark);
    runWithThemeTransition(() => setTheme({ mode: next }));
  };

  const handleLogout = async () => {
    await logout();
    toast.success("已退出登录", "期待下次再见。");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="打开菜单"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div key={location.pathname} className="fade-in flex min-w-0 flex-1 items-center gap-2.5">
        <Icon className="hidden h-4 w-4 shrink-0 text-primary sm:block" strokeWidth={2} />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight">{meta.title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            {meta.description}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <span className="mr-1 hidden text-[11px] text-muted-foreground xl:inline">
          数据更新于{" "}
          {updatedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </span>

        <Button
          variant="ghost"
          size="icon"
          aria-label="全局搜索"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-[18px] w-[18px]" />
        </Button>

        {authenticated ? (
          <>
            <Link
              to="/favorites"
              aria-label="我的收藏"
              className="relative hidden h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
            >
              <Flower2 className="h-[18px] w-[18px]" />
              <IconBadge count={favoriteCount} />
            </Link>
            <Link
              to="/cart"
              aria-label="购物车"
              className="relative flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <IconBadge count={cartCount} />
            </Link>
          </>
        ) : null}

        {isStaff ? (
          <Link
            to="/staff/orders"
            className="relative hidden h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
          >
            <span>待接单</span>
            <Badge variant={pendingCount > 0 ? "warning" : "secondary"}>{pendingCount}</Badge>
          </Link>
        ) : null}

        <Button variant="ghost" size="icon" aria-label="刷新数据" onClick={handleRefresh}>
          <RefreshCw className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={resolvedDark ? "切换到亮色模式" : "切换到暗色模式"}
          onClick={handleThemeToggle}
        >
          {resolvedDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>

        {authenticated && user ? (
          <DropdownMenu
            triggerLabel="用户菜单"
            trigger={
              <span className="ml-1 flex items-center gap-2 rounded-md p-0.5 transition-opacity hover:opacity-85">
                <UserAvatar name={user.nickname || user.username} size="sm" />
              </span>
            }
            contentClassName="w-56"
          >
            <DropdownLabel>当前账号</DropdownLabel>
            <div className="px-2.5 pb-2">
              <p className="truncate text-sm font-medium">{user.nickname || user.username}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                @{user.username} · {user.roleLabel}
              </p>
            </div>
            <DropdownSeparator />
            <DropdownItem onClick={() => navigate("/profile")}>
              <UserRound className="h-4 w-4" />
              个人中心
            </DropdownItem>
            <DropdownItem onClick={() => navigate("/orders")}>
              <ReceiptText className="h-4 w-4" />
              我的订单
            </DropdownItem>
            <DropdownItem onClick={() => navigate("/settings")}>
              <Settings2 className="h-4 w-4" />
              外观与偏好
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem destructive onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              退出登录
            </DropdownItem>
          </DropdownMenu>
        ) : (
          <div className="ml-1 flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              <LogIn className="h-4 w-4" />
              登录
            </Button>
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/register")}>
              注册
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
