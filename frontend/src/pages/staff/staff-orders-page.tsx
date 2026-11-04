import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { staffService } from "@/lib/services";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { OrderStatus } from "@/types/api";
import { useDict } from "@/hooks/queries";
import { OrderStatusBadge } from "@/components/domain/status-badge";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 10;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const statusTabs: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "", label: "全部" },
  { value: "PAID", label: "待接单" },
  { value: "FULFILLING", label: "履约中" },
  { value: "AFTER_SALE", label: "待售后" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
  { value: "PENDING_PAYMENT", label: "待支付" },
];

export function StaffOrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const dict = useDict();

  const pageParam = Number(params.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;
  const statusParam = params.get("status") ?? "";
  const status = statusTabs.some((tab) => tab.value === statusParam)
    ? (statusParam as OrderStatus | "")
    : "";
  const keyword = params.get("keyword") ?? "";
  const startParam = params.get("start") ?? "";
  const endParam = params.get("end") ?? "";
  const start = DATE_PATTERN.test(startParam) ? startParam : "";
  const end = DATE_PATTERN.test(endParam) ? endParam : "";

  const [keywordDraft, setKeywordDraft] = useState(keyword);
  const [startDraft, setStartDraft] = useState(start);
  const [endDraft, setEndDraft] = useState(end);

  useEffect(() => {
    setKeywordDraft(keyword);
    setStartDraft(start);
    setEndDraft(end);
  }, [keyword, start, end]);

  const query = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      status: status || undefined,
      keyword: keyword || undefined,
      start: start ? `${start}T00:00:00` : undefined,
      end: end ? `${end}T23:59:59` : undefined,
    }),
    [page, status, keyword, start, end],
  );

  const orders = useQuery({
    queryKey: queryKeys.staffOrders(query),
    queryFn: () => staffService.orders(query),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const accept = useMutation({
    mutationFn: (id: number) => staffService.accept(id),
    onSuccess: (_, id) => {
      toast.success("已接单", "订单已进入履约中，请继续备花。");
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/staff/orders/${id}`);
    },
    onError: (error) => toast.error("接单失败", getErrorMessage(error)),
  });

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setParams(next);
  };

  const applyFilters = () => {
    if (startDraft && endDraft && startDraft > endDraft) {
      toast.error("时间范围有误", "开始日期不能晚于结束日期。");
      return;
    }
    updateParams({
      keyword: keywordDraft.trim() || undefined,
      start: startDraft || undefined,
      end: endDraft || undefined,
      page: undefined,
    });
  };

  const resetFilters = () => {
    setKeywordDraft("");
    setStartDraft("");
    setEndDraft("");
    setParams(new URLSearchParams());
  };

  const groupLabel =
    dict.data?.orderStatuses.reduce<Record<string, string>>((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {}) ?? {};

  const records = orders.data?.records ?? [];
  const activeFilterCount = [keyword, start, end, status].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">订单履约</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            接单、推进备花与配送节点，处理取消与售后。列表每 30 秒自动刷新。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orders.isFetching ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              同步中
            </span>
          ) : null}
          <Badge variant="secondary">STAFF 工作台</Badge>
        </div>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {statusTabs.map((tab) => {
          const active = status === tab.value;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() =>
                updateParams({ status: tab.value || undefined, page: undefined })
              }
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
                active
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/60",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section className="ui-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            筛选订单
          </h2>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={resetFilters}
            >
              <X className="h-3 w-3" />
              清除 {activeFilterCount} 项
            </Button>
          ) : null}
        </div>
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="staff-keyword"
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
              placeholder="订单号、买家、收货人、电话或商品"
              className="pl-8"
              aria-label="搜索订单"
            />
          </div>
          <DatePicker
            id="staff-start"
            value={startDraft}
            onChange={setStartDraft}
            placeholder="开始日期"
            className="w-40"
            aria-label="下单开始"
          />
          <DatePicker
            id="staff-end"
            value={endDraft}
            onChange={setEndDraft}
            placeholder="结束日期"
            className="w-40"
            aria-label="下单结束"
          />
          <Button type="submit" size="sm">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            筛选
          </Button>
        </form>
      </section>

      {orders.isLoading ? (
        <div className="ui-card p-4">
          <TableSkeleton rows={6} />
        </div>
      ) : orders.isError ? (
        <ErrorState
          title="订单列表没送到"
          description={getErrorMessage(orders.error)}
          onRetry={() => void orders.refetch()}
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={hasFilters ? "没有符合条件的订单" : "当前没有订单"}
          description={
            hasFilters
              ? "试试调整状态、关键词或时间范围。"
              : "新订单支付后会出现在这里。"
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                清除筛选
              </Button>
            ) : undefined
          }
          className="py-20"
        />
      ) : (
        <section className="ui-card overflow-hidden">
          <TableWrap>
            <Table className="min-w-[900px]">
              <THead>
                <TR className="hover:bg-transparent">
                  <TH className="pl-4">订单</TH>
                  <TH>买家 / 收花人</TH>
                  <TH>花礼</TH>
                  <TH className="text-right">实付</TH>
                  <TH>状态</TH>
                  <TH className="pr-4 text-right">操作</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((order) => (
                  <TR key={order.id}>
                    <TD className="pl-4">
                      <Link
                        to={`/staff/orders/${order.id}`}
                        className="font-mono-ui text-[11px] hover:text-primary"
                      >
                        {order.orderNo}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </TD>
                    <TD>
                      <p className="text-xs font-medium">
                        {order.buyerNickname || order.buyerUsername || order.receiverName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {order.receiverName} · {order.receiverPhone}
                      </p>
                    </TD>
                    <TD>
                      <p className="max-w-52 truncate text-xs">
                        {order.items[0]?.productName ?? "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        共 {order.items.reduce((total, item) => total + item.quantity, 0)} 件
                      </p>
                    </TD>
                    <TD className="text-right text-xs font-medium tabular">
                      {formatCurrency(order.payAmount)}
                    </TD>
                    <TD>
                      <OrderStatusBadge status={order.status} label={order.statusLabel} />
                      {order.afterSaleReason ? (
                        <p className="mt-1 max-w-40 truncate text-[10px] text-warning">
                          售后：{order.afterSaleReason}
                        </p>
                      ) : null}
                    </TD>
                    <TD className="pr-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {order.status === "PAID" ? (
                          <Button
                            size="sm"
                            loading={accept.isPending && accept.variables === order.id}
                            onClick={() => accept.mutate(order.id)}
                          >
                            接单
                          </Button>
                        ) : null}
                        {order.status === "FULFILLING" ? (
                          <Button size="sm" asChild>
                            <Link to={`/staff/orders/${order.id}`}>推进节点</Link>
                          </Button>
                        ) : null}
                        {order.status === "AFTER_SALE" ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/staff/orders/${order.id}`}>处理售后</Link>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/staff/orders/${order.id}`}>详情</Link>
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </section>
      )}

      {orders.data && orders.data.total > 0 ? (
        <Pagination
          page={orders.data.page}
          pages={orders.data.pages}
          total={orders.data.total}
          pageSize={orders.data.size}
          onPageChange={(next) => updateParams({ page: String(next) })}
        />
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        {groupLabel.PAID ? "待接单为已支付订单；" : ""}
        订单状态以服务端为准，操作冲突时会自动刷新。
      </p>
    </div>
  );
}
