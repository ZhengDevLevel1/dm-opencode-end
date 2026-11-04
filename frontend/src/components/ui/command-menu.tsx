import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Loader2,
  PackageSearch,
  ReceiptText,
  Search,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { canSeeRole, navGroups } from "@/app/shell/nav";
import { queryKeys } from "@/lib/query-keys";
import { adminService, productService, staffService } from "@/lib/services";
import { formatCurrency } from "@/lib/format";

interface CommandEntry {
  id: string;
  group: string;
  label: string;
  description?: string;
  icon: typeof Search;
  onSelect: () => void;
}

const RECENT_KEY = "flower.command.recent";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  if (!term.trim()) return;
  try {
    const next = [term, ...readRecent().filter((item) => item !== term)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function CommandMenu() {
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState<string[]>(readRecent);

  const trimmed = query.trim();
  const isStaff = user?.role === "STAFF" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!open) return;
    setSelected(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const productQuery = useQuery({
    queryKey: ["command", "products", trimmed],
    queryFn: () => productService.list({ keyword: trimmed, page: 1, size: 5 }),
    enabled: open && trimmed.length > 0,
    staleTime: 30_000,
  });

  const staffOrderQuery = useQuery({
    queryKey: queryKeys.staffOrders({ page: 1, size: 5, keyword: trimmed }),
    queryFn: () => staffService.orders({ page: 1, size: 5, keyword: trimmed }),
    enabled: open && trimmed.length > 0 && isStaff,
    staleTime: 15_000,
  });

  const userQuery = useQuery({
    queryKey: queryKeys.adminUsers({ page: 1, size: 5, keyword: trimmed }),
    queryFn: () => adminService.users({ page: 1, size: 5, keyword: trimmed }),
    enabled: open && trimmed.length > 0 && isAdmin,
    staleTime: 15_000,
  });

  const pageEntries = useMemo(() => {
    const entries: CommandEntry[] = [];
    navGroups.forEach((group) => {
      if (group.roles && !canSeeRole(user?.role, group.roles)) return;
      if (group.auth && !user) return;
      group.items.forEach((item) => {
        if (!item.label.toLowerCase().includes(trimmed.toLowerCase()) && !item.description.toLowerCase().includes(trimmed.toLowerCase())) {
          return;
        }
        entries.push({
          id: `page-${item.to}`,
          group: "页面快捷入口",
          label: item.label,
          description: item.description,
          icon: item.icon,
          onSelect: () => navigate(item.to),
        });
      });
    });
    return entries;
  }, [trimmed, user, navigate]);

  const recentEntries = useMemo<CommandEntry[]>(() => {
    if (trimmed || recent.length === 0) return [];
    return recent.map((term) => ({
      id: `recent-${term}`,
      group: "最近搜索",
      label: term,
      description: "继续搜索这个关键词",
      icon: Search,
      onSelect: () => {
        setQuery(term);
        inputRef.current?.focus();
      },
    }));
  }, [recent, trimmed]);

  const resultEntries = useMemo<CommandEntry[]>(() => {
    if (!trimmed) return [];
    const entries: CommandEntry[] = [];
    productQuery.data?.records.forEach((product) => {
      entries.push({
        id: `product-${product.id}`,
        group: "商品搜索",
        label: product.name,
        description: `${product.category} · ${formatCurrency(product.price)} · 库存 ${product.stock}`,
        icon: PackageSearch,
        onSelect: () => {
          saveRecent(trimmed);
          setRecent(readRecent());
          navigate(`/products/${product.id}`);
        },
      });
    });
    if (isStaff) {
      staffOrderQuery.data?.records.forEach((order) => {
        entries.push({
          id: `order-${order.id}`,
          group: "订单搜索",
          label: order.orderNo,
          description: `${order.receiverName} · ${order.statusLabel} · ${formatCurrency(order.payAmount)}`,
          icon: ReceiptText,
          onSelect: () => {
            saveRecent(trimmed);
            setRecent(readRecent());
            navigate(`/staff/orders/${order.id}`);
          },
        });
      });
    }
    if (isAdmin) {
      userQuery.data?.records.forEach((item) => {
        entries.push({
          id: `user-${item.id}`,
          group: "用户搜索",
          label: item.nickname || item.username,
          description: `@${item.username} · ${item.roleLabel} · ${item.statusLabel}`,
          icon: UsersRound,
          onSelect: () => {
            saveRecent(trimmed);
            setRecent(readRecent());
            navigate(`/admin/users?keyword=${encodeURIComponent(item.username)}`);
          },
        });
      });
    }
    return entries;
  }, [trimmed, productQuery.data, staffOrderQuery.data, userQuery.data, isStaff, isAdmin, navigate]);

  const entries = useMemo(
    () => [...recentEntries, ...pageEntries, ...resultEntries],
    [recentEntries, pageEntries, resultEntries],
  );

  const loading =
    trimmed.length > 0 &&
    (productQuery.isFetching || (isStaff && staffOrderQuery.isFetching) || (isAdmin && userQuery.isFetching));

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  useEffect(() => {
    setSelected(0);
  }, [entries.length]);

  useEffect(() => {
    if (!open) return;
    const node = document.querySelector<HTMLElement>(`[data-command-index="${selected}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);

  if (!open) return null;

  const grouped = entries.reduce<Record<string, CommandEntry[]>>((acc, entry) => {
    acc[entry.group] = acc[entry.group] ?? [];
    acc[entry.group].push(entry);
    return acc;
  }, {});

  let flatIndex = -1;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((index) => (entries.length === 0 ? 0 : (index + 1) % entries.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((index) => (entries.length === 0 ? 0 : (index - 1 + entries.length) % entries.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = entries[selected];
      if (entry) {
        if (!entry.id.startsWith("recent-") && trimmed) {
          saveRecent(trimmed);
          setRecent(readRecent());
        }
        entry.onSelect();
        setOpen(false);
        setQuery("");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]">
      <div
        className="fade-in absolute inset-0 bg-foreground/30 backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        className="pop-in relative flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-border/60 bg-popover shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="flex h-12 items-center gap-3 border-b border-border/60 px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索页面、花礼、订单或用户…"
            aria-label="搜索关键词"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          <kbd className="hidden rounded border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {entries.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium">没有找到相关记录</p>
              <p className="mt-1 text-xs text-muted-foreground">
                换个关键词试试，或直接进入页面快捷入口。
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, groupEntries]) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  {group}
                </p>
                {groupEntries.map((entry) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const Icon = entry.icon;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      data-command-index={index}
                      onMouseEnter={() => setSelected(index)}
                      onClick={() => {
                        if (!entry.id.startsWith("recent-") && trimmed) {
                          saveRecent(trimmed);
                          setRecent(readRecent());
                        }
                        entry.onSelect();
                        setOpen(false);
                        if (!entry.id.startsWith("recent-")) setQuery("");
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                        selected === index
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{entry.label}</span>
                        {entry.description ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {entry.description}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ 选择 · Enter 打开 · Esc 关闭</span>
          <span>花屿 Bloom Isle</span>
        </div>
      </div>
    </div>
  );
}
