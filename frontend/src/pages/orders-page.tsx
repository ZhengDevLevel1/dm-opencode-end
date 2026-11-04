import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, CreditCard, MessageSquareText, PackageOpen } from "lucide-react";
import { orderService } from "@/lib/services";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { OrderStatus, OrderVO } from "@/types/api";
import { useDict } from "@/hooks/queries";
import { OrderStatusBadge } from "@/components/domain/status-badge";
import { ProductImage } from "@/components/domain/product-image";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 10;

const knownStatuses: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "FULFILLING",
  "COMPLETED",
  "AFTER_SALE",
  "CANCELLED",
  "REFUNDED",
];

type DialogState = { type: "cancel" | "after-sale"; order: OrderVO } | null;

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const dict = useDict();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pageParam = Number(params.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;
  const statusParam = params.get("status") ?? "";
  const status = knownStatuses.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined;

  const query = useMemo(() => ({ page, size: PAGE_SIZE, status }), [page, status]);
  const orders = useQuery({
    queryKey: queryKeys.orders(query),
    queryFn: () => orderService.list(query),
    staleTime: queryPolicy.orders.staleTime,
    placeholderData: keepPreviousData,
  });

  const tabs = useMemo(
    () =>
      knownStatuses.map((value) => ({
        value,
        label:
          dict.data?.orderStatuses.find((item) => item.value === value)?.label ??
          value,
      })),
    [dict.data],
  );

  const updateParams = (patch: { status?: string; page?: number }) => {
    const next = new URLSearchParams(params);
    if (patch.status !== undefined) {
      if (patch.status) next.set("status", patch.status);
      else next.delete("status");
      next.delete("page");
    }
    if (patch.page !== undefined) {
      if (patch.page <= 1) next.delete("page");
      else next.set("page", String(patch.page));
    }
    setParams(next);
  };

  const invalidateOrder = (orderId: number) => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
    void queryClient.invalidateQueries({ queryKey: ["staff"] });
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason: cancelReason }: { id: number; reason: string }) =>
      orderService.cancel(id, cancelReason ? { reason: cancelReason } : undefined),
    onSuccess: (order) => {
      toast.success("订单已取消", order.orderNo);
      invalidateOrder(order.id);
      setDialog(null);
      setReason("");
    },
    onError: (error) => toast.error("取消订单失败", getErrorMessage(error)),
  });

  const afterSaleMutation = useMutation({
    mutationFn: ({ id, reason: saleReason }: { id: number; reason: string }) =>
      orderService.afterSale(id, { reason: saleReason }),
    onSuccess: (order) => {
      toast.success("售后申请已提交", "花艺师会尽快联系你确认处理方式。");
      invalidateOrder(order.id);
      setDialog(null);
      setReason("");
    },
    onError: (error) => toast.error("提交售后申请失败", getErrorMessage(error)),
  });

  const openDialog = (type: "cancel" | "after-sale", order: OrderVO) => {
    setDialog({ type, order });
    setReason("");
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
    setReason("");
  };

  const submitDialog = async () => {
    if (!dialog) return;
    if (dialog.type === "after-sale" && reason.trim().length === 0) {
      toast.error("请填写售后原因");
      return;
    }
    setSubmitting(true);
    try {
      if (dialog.type === "cancel") {
        await cancelMutation.mutateAsync({ id: dialog.order.id, reason: reason.trim() });
      } else {
        await afterSaleMutation.mutateAsync({ id: dialog.order.id, reason: reason.trim() });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const records = orders.data?.records ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">我的订单</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            查看支付、配送与售后进度。订单状态由后端实时返回。
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/products">
            <PackageOpen className="h-3.5 w-3.5" />
            继续挑花
          </Link>
        </Button>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => updateParams({ status: "" })}
          className={cn(
            "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
            !status
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted/60",
          )}
        >
          全部
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateParams({ status: tab.value })}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
              status === tab.value
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/60",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {orders.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="ui-card p-4">
              <TableSkeleton rows={2} />
            </div>
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState
          description={getErrorMessage(orders.error)}
          onRetry={() => void orders.refetch()}
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={status ? "这个状态下还没有订单" : "还没有订单"}
          description={
            status
              ? "换一个状态看看，或者继续去挑一束当季花礼。"
              : "挑一束花，让花艺师替你整理好送到收花人手上。"
          }
          action={
            <Button asChild>
              <Link to="/products">去挑花</Link>
            </Button>
          }
          className="py-20"
        />
      ) : (
        <div className="space-y-3">
          {records.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onCancel={() => openDialog("cancel", order)}
              onAfterSale={() => openDialog("after-sale", order)}
            />
          ))}
        </div>
      )}

      {orders.data && orders.data.total > 0 ? (
        <Pagination
          page={orders.data.page}
          pages={orders.data.pages}
          total={orders.data.total}
          pageSize={orders.data.size}
          onPageChange={(next) => updateParams({ page: next })}
        />
      ) : null}

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title={dialog?.type === "cancel" ? "取消订单？" : "申请售后"}
        description={
          dialog?.type === "cancel"
            ? `订单 ${dialog.order.orderNo} 取消后库存会由后端回补，操作不可撤销。`
            : "请描述遇到的问题，例如花材与描述不符、配送破损等。"
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              再想想
            </Button>
            <Button
              variant={dialog?.type === "cancel" ? "destructive" : "default"}
              onClick={submitDialog}
              loading={submitting}
              disabled={dialog?.type === "after-sale" && !reason.trim()}
            >
              {dialog?.type === "cancel" ? "确认取消" : "提交申请"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="order-reason">
            {dialog?.type === "cancel" ? "取消原因（选填）" : "售后原因 *"}
          </Label>
          <Textarea
            id="order-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={255}
            placeholder={
              dialog?.type === "cancel" ? "例如：临时改变计划" : "请说明具体问题"
            }
            className="min-h-24"
            data-autofocus
          />
          <p className="text-right text-[11px] text-muted-foreground tabular">
            {reason.length}/255
          </p>
        </div>
      </Dialog>
    </div>
  );
}

function OrderRow({
  order,
  onCancel,
  onAfterSale,
}: {
  order: OrderVO;
  onCancel: () => void;
  onAfterSale: () => void;
}) {
  const previewItems = order.items.slice(0, 3);
  const restCount = order.items.length - previewItems.length;

  return (
    <article className="ui-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-mono-ui text-[11px] text-muted-foreground">{order.orderNo}</span>
          <span className="text-muted-foreground">{formatDateTime(order.createdAt)}</span>
        </div>
        <OrderStatusBadge status={order.status} label={order.statusLabel} />
      </header>

      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex -space-x-3">
            {previewItems.map((item) => (
              <ProductImage
                key={item.id}
                src={item.productImage}
                alt={item.productName}
                seed={item.productName}
                className="h-14 w-12 shrink-0 rounded-md ring-2 ring-card"
                iconClassName="h-5 w-5"
              />
            ))}
            {restCount > 0 ? (
              <span className="flex h-14 w-12 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground ring-2 ring-card">
                +{restCount}
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <Link
              to={`/orders/${order.id}`}
              className="line-clamp-1 text-sm font-medium hover:text-primary"
            >
              {previewItems.map((item) => item.productName).join("、")}
              {restCount > 0 ? ` 等 ${order.items.length} 件` : ""}
            </Link>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              收货人 {order.receiverName} · {order.receiverPhone}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {order.receiverAddress}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 md:flex-col md:items-end md:gap-1">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">实付金额</p>
            <p className="text-base font-semibold tabular">{formatCurrency(order.payAmount)}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {order.status === "PENDING_PAYMENT" ? (
              <>
                <Button size="sm" asChild>
                  <Link to={`/orders/${order.id}?pay=1`}>
                    <CreditCard className="h-3.5 w-3.5" />
                    立即支付
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  取消订单
                </Button>
              </>
            ) : order.status === "COMPLETED" ? (
              <>
                <Button size="sm" variant="outline" onClick={onAfterSale}>
                  <MessageSquareText className="h-3.5 w-3.5" />
                  申请售后
                </Button>
                {order.items.some((item) => !item.reviewed) ? (
                  <Button size="sm" asChild>
                    <Link to={`/reviews?orderId=${order.id}`}>
                      <MessageSquareText className="h-3.5 w-3.5" />
                      去评价
                    </Link>
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/orders/${order.id}`}>
                查看详情
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
