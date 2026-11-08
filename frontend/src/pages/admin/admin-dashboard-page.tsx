import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  MessageSquareText,
  MonitorPlay,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Star,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import { useDict } from "@/hooks/queries";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDate, formatNumber, formatRating } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/types/api";
import { orderStatusVariant } from "@/components/domain/status-badge";
import { StatCard } from "@/components/domain/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const trendRanges = [
  { days: 7, label: "近 7 天" },
  { days: 30, label: "近 30 天" },
  { days: 90, label: "近 90 天" },
];

const statusColors: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-400",
  PAID: "bg-sky-400",
  FULFILLING: "bg-indigo-400",
  COMPLETED: "bg-emerald-400",
  CANCELLED: "bg-slate-300",
  AFTER_SALE: "bg-orange-400",
  REFUNDED: "bg-rose-400",
};

const pieColors = [
  "#38bdf8",
  "#818cf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
  "#2dd4bf",
];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 24px rgb(15 23 42 / 0.08)",
};

type DashboardWidgetKey = "metrics" | "charts" | "breakdown";

const dashboardWidgets: Array<{
  key: DashboardWidgetKey;
  label: string;
  description: string;
}> = [
  {
    key: "metrics",
    label: "关键经营指标",
    description: "销售额、订单、待履约与低库存，含可展开的更多指标",
  },
  {
    key: "charts",
    label: "趋势与状态",
    description: "销售趋势与订单状态分布",
  },
  {
    key: "breakdown",
    label: "品类与热销",
    description: "品类销售与热销花礼 Top 10",
  },
];

const dashboardWidgetKeys = dashboardWidgets.map((widget) => widget.key);
const DASHBOARD_LAYOUT_STORAGE_KEY = "flower.dashboard-layout";

interface DashboardLayoutConfig {
  order: DashboardWidgetKey[];
  hidden: DashboardWidgetKey[];
}

const defaultDashboardLayout: DashboardLayoutConfig = {
  order: dashboardWidgetKeys,
  hidden: [],
};

function isDashboardWidgetKey(value: unknown): value is DashboardWidgetKey {
  return typeof value === "string" && dashboardWidgetKeys.includes(value as DashboardWidgetKey);
}

function loadDashboardLayout(): DashboardLayoutConfig {
  try {
    const raw = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!raw) return defaultDashboardLayout;
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutConfig>;
    const storedOrder = Array.isArray(parsed.order)
      ? parsed.order.filter(isDashboardWidgetKey)
      : [];
    const order = [...storedOrder];
    dashboardWidgetKeys.forEach((key) => {
      if (!order.includes(key)) order.push(key);
    });
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter(isDashboardWidgetKey)
      : [];
    return { order, hidden };
  } catch {
    return defaultDashboardLayout;
  }
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const dict = useDict();
  const [days, setDays] = useState(30);
  const [moreMetricsOpen, setMoreMetricsOpen] = useState(false);
  const [layout, setLayout] = useState<DashboardLayoutConfig>(loadDashboardLayout);
  const [layoutOpen, setLayoutOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  const widgetOrder = (key: DashboardWidgetKey) => layout.order.indexOf(key);
  const widgetHidden = (key: DashboardWidgetKey) => layout.hidden.includes(key);

  const overview = useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: adminService.overview,
    ...queryPolicy.stats,
  });
  const trend = useQuery({
    queryKey: queryKeys.adminSalesTrend(days),
    queryFn: () => adminService.salesTrend(days),
    staleTime: 60_000,
  });
  const categories = useQuery({
    queryKey: queryKeys.adminCategorySales,
    queryFn: adminService.categorySales,
    staleTime: 60_000,
  });
  const statuses = useQuery({
    queryKey: queryKeys.adminOrderStatus,
    queryFn: adminService.orderStatus,
    staleTime: 60_000,
  });
  const topProducts = useQuery({
    queryKey: queryKeys.adminTopProducts,
    queryFn: adminService.topProducts,
    staleTime: 60_000,
  });

  const data = overview.data;
  const statusTotal = statuses.data?.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const categoryTotal = categories.data?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const categoryMax = Math.max(
    ...(categories.data ?? []).map((item) => item.amount),
    1,
  );
  const lastUpdatedAt = Math.max(
    overview.dataUpdatedAt,
    trend.dataUpdatedAt,
    categories.dataUpdatedAt,
    statuses.dataUpdatedAt,
    topProducts.dataUpdatedAt,
  );
  const refreshing =
    overview.isFetching ||
    trend.isFetching ||
    categories.isFetching ||
    statuses.isFetching ||
    topProducts.isFetching;

  const refreshAll = () => {
    void overview.refetch();
    void trend.refetch();
    void categories.refetch();
    void statuses.refetch();
    void topProducts.refetch();
  };

  if (overview.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (overview.isError) {
    return (
      <ErrorState
        title="经营数据没送到"
        description={getErrorMessage(overview.error)}
        onRetry={() => void overview.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">经营总览</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            销售额只统计已支付、履约中、已完成与售后中的订单。数据来自后端实时统计。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {trendRanges.map((range) => (
              <button
                key={range.days}
                type="button"
                aria-pressed={days === range.days}
                onClick={() => setDays(range.days)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  days === range.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" loading={refreshing} onClick={refreshAll}>
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLayoutOpen(true)}>
            <LayoutGrid className="h-3.5 w-3.5" />
            布局
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/board">
              <MonitorPlay className="h-3.5 w-3.5" />
              门店看板
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-[11px] text-muted-foreground">
        <span>统计口径：销售额包含 PAID / FULFILLING / COMPLETED / AFTER_SALE 订单。</span>
        <span className="tabular">
          最近更新{" "}
          {lastUpdatedAt > 0
            ? new Date(lastUpdatedAt).toLocaleTimeString("zh-CN", { hour12: false })
            : "—"}
        </span>
      </div>

      <div className="flex flex-col gap-5">
        <div
          className="space-y-3"
          style={{
            order: widgetOrder("metrics"),
            display: widgetHidden("metrics") ? "none" : undefined,
          }}
        >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="总销售额"
          value={formatCurrency(data?.totalSales)}
          hint={`今日 ${formatCurrency(data?.todaySales)}`}
          filled
        />
        <StatCard
          icon={ClipboardList}
          label="订单总数"
          value={formatNumber(data?.totalOrders)}
          hint={`今日新增 ${formatNumber(data?.todayOrders)} 笔`}
          onClick={() => navigate("/staff/orders")}
        />
        <StatCard
          icon={PackageCheck}
          label="待履约订单"
          value={formatNumber(data?.pendingFulfillment)}
          hint="已支付，等待店员接单"
          onClick={() => navigate("/staff/orders?status=PAID")}
        />
        <StatCard
          icon={TriangleAlert}
          label="低库存商品"
          value={formatNumber(data?.lowStockProducts)}
          hint={`库存低于 ${dict.data?.metrics?.stockLowThreshold ?? 10} 件`}
          onClick={() => navigate("/staff/inventory?lowStock=1")}
        />
      </section>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">其余经营指标</p>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={moreMetricsOpen}
          onClick={() => setMoreMetricsOpen((open) => !open)}
        >
          {moreMetricsOpen ? "收起更多指标" : "展开更多指标"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              moreMetricsOpen && "rotate-180",
            )}
          />
        </Button>
      </div>

      {moreMetricsOpen ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MiniStat
            icon={CircleDollarSign}
            label="今日销售额"
            value={formatCurrency(data?.todaySales)}
          />
          <MiniStat
            icon={CalendarDays}
            label="今日订单"
            value={formatNumber(data?.todayOrders)}
          />
          <MiniStat
            icon={ShoppingBag}
            label="在售商品"
            value={formatNumber(data?.onSaleProducts)}
          />
          <MiniStat
            icon={UsersRound}
            label="客户数"
            value={formatNumber(data?.customerCount)}
          />
          <MiniStat
            icon={MessageSquareText}
            label="评价总数"
            value={formatNumber(data?.totalReviews)}
          />
          <MiniStat
            icon={Star}
            label="平均评分"
            value={data ? `${formatRating(data.averageRating)} / 5` : "—"}
          />
        </section>
      ) : null}
        </div>

      <section
        className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"
        style={{
          order: widgetOrder("charts"),
          display: widgetHidden("charts") ? "none" : undefined,
        }}
      >
        <div className="ui-card p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">销售趋势</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                按天汇总销售额与订单数，窗口最长 90 天。
              </p>
            </div>
            <Badge variant="secondary">近 {days} 天</Badge>
          </div>

          {trend.isLoading ? (
            <Skeleton className="mt-4 h-64 w-full rounded-lg" />
          ) : trend.isError ? (
            <ErrorState
              className="mt-4"
              compact
              title="趋势数据加载失败"
              description={getErrorMessage(trend.error)}
              onRetry={() => void trend.refetch()}
            />
          ) : !trend.data || trend.data.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="暂无销售趋势"
              description="有支付成功的订单后，这里会按天展示销售曲线。"
              bare
            />
          ) : (
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(value: number) =>
                      value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
                    }
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) =>
                      name === "amount" ? [formatCurrency(value), "销售额"] : [value, "订单数"]
                    }
                    labelFormatter={(label: string) => `日期 ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#salesFill)"
                    name="amount"
                  />
                  <Line
                    type="monotone"
                    dataKey="orderCount"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                    name="orderCount"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="ui-card p-4 md:p-5">
          <h2 className="text-sm font-semibold tracking-tight">订单状态分布</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">全部 7 种状态，包含数量为 0 的项。</p>
          {statuses.isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : statuses.isError ? (
            <ErrorState
              className="mt-4"
              compact
              title="状态数据加载失败"
              description={getErrorMessage(statuses.error)}
              onRetry={() => void statuses.refetch()}
            />
          ) : (
            <div className="mt-4">
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {(statuses.data ?? []).map((item) =>
                  item.count > 0 ? (
                    <span
                      key={item.status}
                      className={cn("h-full", statusColors[item.status])}
                      style={{
                        width: `${statusTotal > 0 ? (item.count / statusTotal) * 100 : 0}%`,
                      }}
                      title={`${item.statusLabel} ${item.count} 笔`}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-4 space-y-3">
                {(statuses.data ?? []).map((item) => {
                  const percent = statusTotal > 0 ? (item.count / statusTotal) * 100 : 0;
                  return (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={orderStatusVariant[item.status]}>
                            {item.statusLabel}
                          </Badge>
                          <Link
                            to={`/staff/orders?status=${item.status}`}
                            className="text-[10px] text-muted-foreground hover:text-primary"
                          >
                            查看
                          </Link>
                        </div>
                        <span className="text-xs text-muted-foreground tabular">
                          {formatNumber(item.count)} 笔 · {percent.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={percent}
                        label={`${item.statusLabel}占比`}
                        indicatorClassName={statusColors[item.status]}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section
        className="grid gap-4 lg:grid-cols-2"
        style={{
          order: widgetOrder("breakdown"),
          display: widgetHidden("breakdown") ? "none" : undefined,
        }}
      >
        <div className="ui-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">品类销售</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                统计计入销售额的订单，总金额 {formatCurrency(categoryTotal)}。
              </p>
            </div>
          </div>
          {categories.isLoading ? (
            <Skeleton className="mt-4 h-64 w-full rounded-lg" />
          ) : categories.isError ? (
            <ErrorState
              className="mt-4"
              compact
              title="品类数据加载失败"
              description={getErrorMessage(categories.error)}
              onRetry={() => void categories.refetch()}
            />
          ) : !categories.data || categories.data.length === 0 ? (
            <EmptyState className="mt-4" title="暂无品类销售" bare />
          ) : (
            <div className="mt-4 space-y-4">
              {categories.data.map((entry, index) => (
                <div key={entry.category}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{entry.category}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular">
                      {formatCurrency(entry.amount)} · {formatNumber(entry.quantity)} 件
                    </span>
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${entry.category}销售额 ${formatCurrency(entry.amount)}`}
                  >
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.max((entry.amount / categoryMax) * 100, entry.amount > 0 ? 2 : 0)}%`,
                        background: pieColors[index % pieColors.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ui-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">热销花礼 Top 10</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">按销量降序，最多 10 条。</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/products">
                商品管理
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {topProducts.isLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : topProducts.isError ? (
            <ErrorState
              className="mt-4"
              compact
              title="热销榜加载失败"
              description={getErrorMessage(topProducts.error)}
              onRetry={() => void topProducts.refetch()}
            />
          ) : !topProducts.data || topProducts.data.length === 0 ? (
            <EmptyState className="mt-4" title="暂无热销商品" bare />
          ) : (
            <div className="mt-4 space-y-2.5">
              {topProducts.data.map((product, index) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular",
                      index < 3
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{product.productName}</p>
                    <p className="text-[10px] text-muted-foreground tabular">
                      销量 {formatNumber(product.quantity)} · 金额 {formatCurrency(product.amount)}
                    </p>
                  </div>
                  <div className="hidden w-24 sm:block">
                    <Progress
                      value={
                        (product.quantity /
                          Math.max(...(topProducts.data ?? []).map((item) => item.quantity), 1)) *
                        100
                      }
                      indicatorClassName="bg-primary/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        统计口径由后端提供 · 最后加载 {formatDate(new Date().toISOString())}
      </p>

      <DashboardLayoutDialog
        open={layoutOpen}
        onOpenChange={setLayoutOpen}
        layout={layout}
        onLayoutChange={setLayout}
      />

    </div>
  );
}

function DashboardLayoutDialog({
  open,
  onOpenChange,
  layout,
  onLayoutChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: DashboardLayoutConfig;
  onLayoutChange: (layout: DashboardLayoutConfig) => void;
}) {
  const [dragging, setDragging] = useState<DashboardWidgetKey | null>(null);

  const moveWidget = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to) return;
    const next = [...layout.order];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onLayoutChange({ ...layout, order: next });
  };

  const toggleWidget = (key: DashboardWidgetKey) => {
    const hidden = layout.hidden.includes(key);
    onLayoutChange({
      ...layout,
      hidden: hidden
        ? layout.hidden.filter((item) => item !== key)
        : [...layout.hidden, key],
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="自定义看板布局"
      description="拖拽调整顺序，点击眼睛隐藏或显示部件。布局只保存在当前浏览器，不会修改后端数据。"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onLayoutChange({
                order: [...defaultDashboardLayout.order],
                hidden: [...defaultDashboardLayout.hidden],
              })
            }
          >
            恢复默认
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </div>
      }
    >
      <ul className="space-y-2">
        {layout.order.map((key, index) => {
          const widget = dashboardWidgets.find((item) => item.key === key);
          if (!widget) return null;
          const hidden = layout.hidden.includes(key);
          return (
            <li
              key={key}
              draggable
              onDragStart={() => setDragging(key)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging) moveWidget(layout.order.indexOf(dragging), index);
                setDragging(null);
              }}
              onDragEnd={() => setDragging(null)}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors",
                dragging === key && "border-primary/40 bg-primary/5",
                hidden && "opacity-60",
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{widget.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {widget.description}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground tabular">
                {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                aria-label={hidden ? `显示${widget.label}` : `隐藏${widget.label}`}
                onClick={() => toggleWidget(key)}
              >
                {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: string;
}) {
  return (
    <div className="ui-card flex items-center gap-2.5 px-3.5 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold tracking-tight tabular">{value}</p>
      </div>
    </div>
  );
}
