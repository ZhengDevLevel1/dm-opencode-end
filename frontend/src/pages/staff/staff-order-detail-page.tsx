import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  ClipboardList,
  FileQuestion,
  MapPin,
  MessageSquareText,
  Phone,
  Sprout,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { staffService } from "@/lib/services";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { FulfillmentNode, OrderStatus } from "@/types/api";
import { OrderStatusBadge, fulfillmentNodeLabel } from "@/components/domain/status-badge";
import { ProductImage } from "@/components/domain/product-image";
import { FulfillmentTimeline } from "@/components/domain/fulfillment-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const nextNodeMap: Record<FulfillmentNode, FulfillmentNode | null> = {
  ACCEPTED: "PREPARING",
  PREPARING: "DELIVERING",
  DELIVERING: "SIGNED",
  SIGNED: null,
};

const statusHint: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "订单尚未支付。可以取消订单并回补库存。",
  PAID: "已支付，等待接单。接单后进入备花流程。",
  FULFILLING: "履约中。请按备花、配送、签收的顺序推进。",
  COMPLETED: "订单已完成并签收。",
  CANCELLED: "订单已取消，库存已回补。",
  AFTER_SALE: "用户已申请售后，请确认退款或拒绝并填写处理备注。",
  REFUNDED: "订单已退款，库存与销量已由后端回补。",
};

type ActionDialog = "advance" | "cancel" | "approve" | "reject" | null;

const actionMeta: Record<
  Exclude<ActionDialog, null>,
  { title: string; description: string; confirmText: string; destructive?: boolean }
> = {
  advance: {
    title: "推进履约节点",
    description: "节点必须按顺序推进，操作会记录操作人与备注。",
    confirmText: "确认推进",
  },
  cancel: {
    title: "取消订单",
    description: "待支付订单会关闭支付并回补库存；已支付订单会退款、回补库存并减少销量。",
    confirmText: "确认取消",
    destructive: true,
  },
  approve: {
    title: "同意售后并退款",
    description: "订单将变为已退款，支付记录退回，库存回补并减少销量。此操作不可撤销。",
    confirmText: "同意退款",
    destructive: true,
  },
  reject: {
    title: "拒绝售后",
    description: "订单会回到已完成状态，售后备注会追加到订单中。",
    confirmText: "拒绝售后",
  },
};

export function StaffOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orderId = Number(params.id);
  const validId = Number.isInteger(orderId) && orderId > 0;
  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const order = useQuery({
    queryKey: queryKeys.staffOrder(orderId),
    queryFn: () => staffService.order(orderId),
    enabled: validId,
    refetchInterval: 30_000,
  });

  const orderData = order.data;
  const showFulfillments = Boolean(
    orderData &&
      ["PAID", "FULFILLING", "COMPLETED", "AFTER_SALE", "REFUNDED"].includes(orderData.status),
  );

  const fulfillments = useQuery({
    queryKey: queryKeys.staffFulfillments(orderId),
    queryFn: () => staffService.fulfillments(orderId),
    enabled: validId && showFulfillments,
  });

  const latestNode = useMemo<FulfillmentNode | null>(() => {
    const records = fulfillments.data ?? [];
    if (records.length === 0) return null;
    return records[records.length - 1].node;
  }, [fulfillments.data]);

  const nextNode = useMemo<FulfillmentNode | null>(
    () => (latestNode ? nextNodeMap[latestNode] : null),
    [latestNode],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff"] });
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["order"] });
    void queryClient.invalidateQueries({ queryKey: ["fulfillments"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["product"] });
  };

  const accept = useMutation({
    mutationFn: () => staffService.accept(orderId),
    onSuccess: () => {
      toast.success("已接单", "请继续备花，并推进履约节点。");
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 4002) {
        toast.error("订单状态已变化", "正在刷新订单。");
        void order.refetch();
        return;
      }
      toast.error("接单失败", getErrorMessage(error));
    },
  });

  const advance = useMutation({
    mutationFn: (node: FulfillmentNode) =>
      staffService.advance(orderId, { node, remark: remark.trim() || undefined }),
    onSuccess: (_, node) => {
      toast.success(
        node === "SIGNED" ? "已签收，订单完成" : `已推进至${fulfillmentNodeLabel[node]}`,
        node === "SIGNED" ? "履约流程已全部完成。" : undefined,
      );
      closeDialog();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.code === 5501 || error.code === 5502)) {
        toast.error("节点顺序或订单状态不允许", "正在刷新履约记录。");
        closeDialog();
        invalidate();
        return;
      }
      toast.error("推进节点失败", getErrorMessage(error));
    },
  });

  const cancel = useMutation({
    mutationFn: () => staffService.cancel(orderId, remark.trim() ? { reason: remark.trim() } : undefined),
    onSuccess: () => {
      toast.success("订单已取消", "支付与库存已由后端处理。");
      closeDialog();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 4002) {
        toast.error("当前状态无法取消", "正在刷新订单。");
        closeDialog();
        invalidate();
        return;
      }
      toast.error("取消订单失败", getErrorMessage(error));
    },
  });

  const afterSale = useMutation({
    mutationFn: (approved: boolean) =>
      staffService.afterSale(orderId, { approved, remark: remark.trim() || undefined }),
    onSuccess: (_, approved) => {
      toast.success(
        approved ? "已同意售后" : "已拒绝售后",
        approved ? "订单已退款，库存已回补。" : "订单已回到已完成状态。",
      );
      closeDialog();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 4002) {
        toast.error("当前状态无法处理售后", "正在刷新订单。");
        closeDialog();
        invalidate();
        return;
      }
      toast.error("售后处理失败", getErrorMessage(error));
    },
  });

  const openDialog = (type: Exclude<ActionDialog, null>) => {
    setDialog(type);
    setRemark("");
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
    setRemark("");
  };

  const submitDialog = async () => {
    if (!dialog || !orderData) return;
    if (dialog === "cancel" && !["PENDING_PAYMENT", "PAID"].includes(orderData.status)) {
      toast.error("当前订单状态不能取消");
      return;
    }
    if (dialog === "advance" && !nextNode) {
      toast.error("没有可推进的下一节点");
      return;
    }
    if ((dialog === "approve" || dialog === "reject") && orderData.status !== "AFTER_SALE") {
      toast.error("当前订单没有待处理的售后");
      return;
    }
    setSubmitting(true);
    try {
      if (dialog === "advance" && nextNode) {
        await advance.mutateAsync(nextNode);
      } else if (dialog === "cancel") {
        await cancel.mutateAsync();
      } else if (dialog === "approve" || dialog === "reject") {
        await afterSale.mutateAsync(dialog === "approve");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!validId) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="订单不存在"
        description="链接中的订单编号无效。"
        action={<Button onClick={() => navigate("/staff/orders")}>返回履约工作台</Button>}
      />
    );
  }

  if (order.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="ui-card p-4">
            <TableSkeleton rows={3} />
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (order.isError) {
    const error = order.error instanceof ApiError ? order.error : null;
    if (error?.code === 4001) {
      return (
        <EmptyState
          icon={FileQuestion}
          title="订单不存在"
          description="订单可能已被删除或编号有误。"
          action={<Button onClick={() => navigate("/staff/orders")}>返回履约工作台</Button>}
        />
      );
    }
    return (
      <ErrorState
        title="订单没送到"
        description={getErrorMessage(order.error)}
        onRetry={() => void order.refetch()}
      />
    );
  }

  if (!orderData) return null;

  const canAccept = orderData.status === "PAID";
  const canCancel = ["PENDING_PAYMENT", "PAID"].includes(orderData.status);
  const canAdvance = orderData.status === "FULFILLING";
  const canHandleAfterSale = orderData.status === "AFTER_SALE";
  const meta = dialog ? actionMeta[dialog] : null;
  const nextLabel = nextNode ? fulfillmentNodeLabel[nextNode] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/staff/orders">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回履约工作台
          </Link>
        </Button>
        <span className="font-mono-ui text-[11px] text-muted-foreground">
          {orderData.orderNo}
        </span>
      </div>

      <section className="ui-card relative overflow-hidden p-5 md:p-6">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(36rem 16rem at 100% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">履约详情</h1>
                <OrderStatusBadge status={orderData.status} label={orderData.statusLabel} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{statusHint[orderData.status]}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                下单于 {formatDateTime(orderData.createdAt)} · 实付{" "}
                {formatCurrency(orderData.payAmount)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAccept ? (
              <Button onClick={() => accept.mutate()} loading={accept.isPending}>
                <Sprout className="h-4 w-4" />
                接单开始备花
              </Button>
            ) : null}
            {canAdvance ? (
              <Button
                onClick={() => openDialog("advance")}
                disabled={!nextNode || fulfillments.isLoading}
              >
                <ArrowRight className="h-4 w-4" />
                {nextLabel ? `推进至${nextLabel}` : "没有下一节点"}
              </Button>
            ) : null}
            {canHandleAfterSale ? (
              <>
                <Button variant="destructive" onClick={() => openDialog("approve")}>
                  <CircleCheck className="h-4 w-4" />
                  同意退款
                </Button>
                <Button variant="outline" onClick={() => openDialog("reject")}>
                  <XCircle className="h-4 w-4" />
                  拒绝售后
                </Button>
              </>
            ) : null}
            {canCancel ? (
              <Button variant="outline" onClick={() => openDialog("cancel")}>
                取消订单
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="ui-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
              <h2 className="text-base font-semibold tracking-tight">花礼清单</h2>
              <span className="text-xs text-muted-foreground">
                共 {orderData.items.reduce((total, item) => total + item.quantity, 0)} 件
              </span>
            </div>
            <ul className="divide-y divide-border/60">
              {orderData.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-4">
                  <ProductImage
                    src={item.productImage}
                    alt={item.productName}
                    seed={item.productName}
                    className="h-16 w-14 shrink-0 rounded-lg"
                    iconClassName="h-5 w-5"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item.productId}`}
                      className="line-clamp-1 text-sm font-medium hover:text-primary"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.category} · {formatCurrency(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular">
                    {formatCurrency(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3.5">
              <span className="text-sm font-medium">实付金额</span>
              <span className="text-base font-semibold tabular">
                {formatCurrency(orderData.payAmount)}
              </span>
            </div>
          </section>

          <section className="ui-card p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight">履约轨迹</h2>
              {fulfillments.isFetching ? (
                <span className="text-[11px] text-muted-foreground">同步中…</span>
              ) : null}
            </div>
            {!showFulfillments ? (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center">
                <p className="text-sm font-medium">尚未开始履约</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  待支付或已取消订单没有履约记录。
                </p>
              </div>
            ) : fulfillments.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : fulfillments.isError ? (
              <ErrorState
                compact
                title="履约记录暂时不可用"
                description={getErrorMessage(fulfillments.error)}
                onRetry={() => void fulfillments.refetch()}
              />
            ) : (
              <>
                <FulfillmentTimeline records={fulfillments.data ?? []} />
                {latestNode ? (
                  <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                    {latestNode === "SIGNED" ? (
                      <CircleCheck className="h-3.5 w-3.5 text-success" />
                    ) : latestNode === "DELIVERING" ? (
                      <Truck className="h-3.5 w-3.5" />
                    ) : (
                      <Sprout className="h-3.5 w-3.5" />
                    )}
                    当前节点：{fulfillmentNodeLabel[latestNode]}
                    {nextLabel ? ` · 下一步：${nextLabel}` : " · 已全部完成"}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="ui-card p-5">
            <h2 className="text-base font-semibold tracking-tight">收花信息</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-[11px] text-muted-foreground">收花人</dt>
                  <dd className="mt-0.5 text-sm">{orderData.receiverName}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-[11px] text-muted-foreground">联系电话</dt>
                  <dd className="mt-0.5 text-sm tabular">{orderData.receiverPhone}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5 sm:col-span-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-[11px] text-muted-foreground">送达地址</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed">{orderData.receiverAddress}</dd>
                </div>
              </div>
            </dl>
            {orderData.remark || orderData.cancelReason || orderData.afterSaleReason ? (
              <div className="mt-4 space-y-2.5 border-t border-border/60 pt-4 text-sm">
                {orderData.remark ? (
                  <div>
                    <p className="text-[11px] text-muted-foreground">用户备注</p>
                    <p className="mt-0.5 leading-relaxed">{orderData.remark}</p>
                  </div>
                ) : null}
                {orderData.cancelReason ? (
                  <div>
                    <p className="text-[11px] text-muted-foreground">取消原因</p>
                    <p className="mt-0.5 leading-relaxed">{orderData.cancelReason}</p>
                  </div>
                ) : null}
                {orderData.afterSaleReason ? (
                  <div className="rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-warning">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      售后说明
                    </p>
                    <p className="mt-1 text-xs leading-relaxed">{orderData.afterSaleReason}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <section className="ui-card p-5">
            <h2 className="text-base font-semibold tracking-tight">买家信息</h2>
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">买家账号</dt>
                <dd>{orderData.buyerUsername || `#${orderData.userId}`}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">买家昵称</dt>
                <dd>{orderData.buyerNickname || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">用户 ID</dt>
                <dd className="font-mono-ui">#{orderData.userId}</dd>
              </div>
            </dl>
          </section>

          <section className="ui-card p-5">
            <h2 className="text-base font-semibold tracking-tight">订单信息</h2>
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-muted-foreground">订单编号</dt>
                <dd className="font-mono-ui break-all text-right text-[11px]">
                  {orderData.orderNo}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">下单时间</dt>
                <dd>{formatDateTime(orderData.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">支付时间</dt>
                <dd>{formatDateTime(orderData.paidAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">完成时间</dt>
                <dd>{formatDateTime(orderData.completedAt)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                <dt className="text-muted-foreground">商品总额</dt>
                <dd className="tabular">{formatCurrency(orderData.totalAmount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium">实付金额</dt>
                <dd className="text-sm font-semibold tabular">
                  {formatCurrency(orderData.payAmount)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-lg bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              店员端没有支付查询权限，因此不展示支付单号，也不提供代支付按钮。
            </p>
          </section>

          <section className="ui-card p-5">
            <h2 className="text-base font-semibold tracking-tight">履约提示</h2>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
              <li>· 只有已支付订单可以接单，接单后订单进入履约中。</li>
              <li>· 节点必须按备花、配送、签收顺序推进。</li>
              <li>· 签收后订单自动完成，用户即可评价与申请售后。</li>
              <li>· 取消与售后会同步回补库存、退款并调整销量。</li>
            </ul>
          </section>
        </aside>
      </div>

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title={meta?.title ?? ""}
        description={meta?.description}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              取消
            </Button>
            <Button
              variant={meta?.destructive ? "destructive" : "default"}
              onClick={submitDialog}
              loading={submitting}
              disabled={
                (dialog === "advance" && !nextNode) ||
                (dialog === "approve" && !orderData.afterSaleReason)
              }
            >
              {meta?.confirmText ?? "确认"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {dialog === "advance" ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs">
              <Badge variant="secondary">
                {latestNode ? fulfillmentNodeLabel[latestNode] : "未接单"}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge>{nextLabel ?? "完成"}</Badge>
            </div>
          ) : null}
          {dialog === "approve" || dialog === "reject" ? (
            <div className="rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2.5 text-xs leading-relaxed">
              <p className="font-medium">用户售后原因</p>
              <p className="mt-1 text-muted-foreground">{orderData.afterSaleReason || "—"}</p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="staff-remark">
              {dialog === "cancel" ? "取消原因（选填）" : "处理备注（选填）"}
            </Label>
            <Textarea
              id="staff-remark"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              maxLength={200}
              placeholder={
                dialog === "advance"
                  ? "例如：花材已备齐，配送员已取花"
                  : dialog === "approve"
                    ? "可说明退款安排"
                    : "可记录沟通情况"
              }
              className="min-h-20"
              data-autofocus
            />
            <p className="text-right text-[11px] text-muted-foreground tabular">
              {remark.length}/200
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
