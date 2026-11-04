import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CircleDollarSign,
  ClipboardList,
  MessageSquareText,
  PackageCheck,
  ShoppingBag,
  Star,
  TrendingUp,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime, formatNumber, formatRating } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-400",
  PAID: "bg-sky-400",
  FULFILLING: "bg-indigo-400",
  COMPLETED: "bg-emerald-400",
  CANCELLED: "bg-slate-300",
  AFTER_SALE: "bg-orange-400",
  REFUNDED: "bg-rose-400",
};

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 13,
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 24px rgb(15 23 42 / 0.08)",
};

export function StoreBoardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate("/admin");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const overview = useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: adminService.overview,
    ...queryPolicy.stats,
    refetchIntervalInBackground: true,
  });
  const statuses = useQuery({
    queryKey: queryKeys.adminOrderStatus,
    queryFn: adminService.orderStatus,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });
  const trend = useQuery({
    queryKey: queryKeys.adminSalesTrend(7),
    queryFn: () => adminService.salesTrend(7),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });
  const topProducts = useQuery({
    queryKey: queryKeys.adminTopProducts,
    queryFn: adminService.topProducts,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const data = overview.data;
  const statusTotal = statuses.data?.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const topFive = topProducts.data?.slice(0, 5) ?? [];
  const lastUpdated = overview.dataUpdatedAt
    ? new Date(overview.dataUpdatedAt).toLocaleTimeString("zh-CN", { hour12: false })
    : "—";

  return (
    <div className="min-h-screen bg-muted/40 px-5 py-6 text-foreground md:px-8">
      <button
        type="button"
        onClick={() => navigate("/admin")}
        aria-label="退出门店看板"
        title="退出看板（Esc）"
        className="fixed top-5 right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <X className="h-5 w-5" />
      </button>

      <main className="mx-auto w-full max-w-[1680px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3 pr-14">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Bloom Isle · Store Board
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              门店经营看板
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              只读模式 · 每 60 秒自动刷新 · 按 Esc 退出
            </p>
          </div>
          <p className="text-xs text-muted-foreground tabular">
            最后更新 {lastUpdated}
          </p>
        </header>

        {overview.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : overview.isError ? (
          <div className="ui-card flex flex-col items-center justify-center gap-3 p-12 text-center">
            <TriangleAlert className="h-7 w-7 text-destructive" />
            <h2 className="text-sm font-semibold">经营数据加载失败</h2>
            <p className="max-w-lg text-xs text-muted-foreground">
              {getErrorMessage(overview.error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => void overview.refetch()}>
              重试
            </Button>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <BoardMetric
                icon={CircleDollarSign}
                label="总销售额"
                value={formatCurrency(data?.totalSales)}
                hint={`今日 ${formatCurrency(data?.todaySales)}`}
                accent
              />
              <BoardMetric
                icon={ClipboardList}
                label="今日订单"
                value={formatNumber(data?.todayOrders)}
                hint={`累计 ${formatNumber(data?.totalOrders)} 笔`}
              />
              <BoardMetric
                icon={PackageCheck}
                label="待履约"
                value={formatNumber(data?.pendingFulfillment)}
                hint="已支付，等待接单"
              />
              <BoardMetric
                icon={TriangleAlert}
                label="低库存商品"
                value={formatNumber(data?.lowStockProducts)}
                hint="库存低于 10 件"
              />
              <BoardMetric
                icon={ShoppingBag}
                label="在售商品"
                value={formatNumber(data?.onSaleProducts)}
              />
              <BoardMetric
                icon={UsersRound}
                label="顾客数"
                value={formatNumber(data?.customerCount)}
              />
              <BoardMetric
                icon={MessageSquareText}
                label="评价总数"
                value={formatNumber(data?.totalReviews)}
              />
              <BoardMetric
                icon={Star}
                label="平均评分"
                value={`${formatRating(data?.averageRating)} / 5`}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="ui-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">近 7 天销售趋势</h2>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      销售额与订单数按天汇总
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                {trend.isLoading ? (
                  <Skeleton className="mt-4 h-64 w-full rounded-lg" />
                ) : trend.isError ? (
                  <BoardError
                    message={getErrorMessage(trend.error)}
                    onRetry={() => void trend.refetch()}
                  />
                ) : (
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend.data ?? []}>
                        <defs>
                          <linearGradient id="boardSalesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          width={54}
                          tickFormatter={(value: number) =>
                            value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
                          }
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: number, name: string) =>
                            name === "amount"
                              ? [formatCurrency(value), "销售额"]
                              : [formatNumber(value), "订单数"]
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          name="amount"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          fill="url(#boardSalesFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="ui-card p-5">
                <h2 className="text-base font-semibold tracking-tight">订单状态分布</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  全部 7 种状态 · 共 {formatNumber(statusTotal)} 笔
                </p>
                {statuses.isLoading ? (
                  <div className="mt-5 space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-7 w-full" />
                    ))}
                  </div>
                ) : statuses.isError ? (
                  <BoardError
                    message={getErrorMessage(statuses.error)}
                    onRetry={() => void statuses.refetch()}
                  />
                ) : (
                  <>
                    <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-muted">
                      {(statuses.data ?? []).map((item) =>
                        item.count > 0 ? (
                          <span
                            key={item.status}
                            className={cn("h-full", statusColors[item.status])}
                            style={{
                              width: `${statusTotal > 0 ? (item.count / statusTotal) * 100 : 0}%`,
                            }}
                            title={`${item.statusLabel} ${item.count}`}
                          />
                        ) : null,
                      )}
                    </div>
                    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                      {(statuses.data ?? []).map((item) => (
                        <li
                          key={item.status}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                statusColors[item.status],
                              )}
                            />
                            <span className="truncate">{item.statusLabel}</span>
                          </span>
                          <span className="font-medium tabular">{formatNumber(item.count)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>

            <section className="ui-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">热销花礼 Top 5</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    按销量降序，仅展示前 5 件
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">口径以服务端统计为准</p>
              </div>
              {topProducts.isLoading ? (
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : topProducts.isError ? (
                <BoardError
                  message={getErrorMessage(topProducts.error)}
                  onRetry={() => void topProducts.refetch()}
                />
              ) : topFive.length === 0 ? (
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  暂无热销商品
                </p>
              ) : (
                <div className="mt-4 grid gap-2 lg:grid-cols-2">
                  {topFive.map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary tabular">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.productName}</p>
                        <p className="text-[11px] text-muted-foreground tabular">
                          销量 {formatNumber(product.quantity)} · {formatCurrency(product.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 pb-2 text-[11px] text-muted-foreground">
          <span>花屿 Bloom Isle · 门店看板只读模式</span>
          <span>数据生成于 {formatDateTime(new Date().toISOString())}</span>
        </footer>
      </main>
    </div>
  );
}

function BoardMetric({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "ui-card flex items-center gap-4 px-5 py-5",
        accent && "ring-1 ring-primary/20",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          accent ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight tabular md:text-3xl">
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function BoardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}
