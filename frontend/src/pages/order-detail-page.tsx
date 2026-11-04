import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  FileQuestion,
  MapPin,
  MessageSquareText,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { orderService, paymentService } from "@/lib/services";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime, formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { OrderVO, PaymentVO } from "@/types/api";
import { useDict } from "@/hooks/queries";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/domain/status-badge";
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

const statusHint: Record<OrderVO["status"], string> = {
  PENDING_PAYMENT: "订单已创建，请完成支付后等待接单。",
  PAID: "支付已完成，花艺师会尽快接单备花。",
  FULFILLING: "花礼正在准备或配送，可以在下方查看履约轨迹。",
  COMPLETED: "订单已签收完成。欢迎分享真实评价，或申请售后。",
  CANCELLED: "订单已取消，库存已由后端回补。",
  AFTER_SALE: "售后申请处理中，请留意店员联系。",
  REFUNDED: "订单已退款，款项按支付渠道规则处理。",
};

export function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const dict = useDict();
  const orderId = Number(params.id);
  const validId = Number.isInteger(orderId) && orderId > 0;
  const [payment, setPayment] = useState<PaymentVO | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<"cancel" | "after-sale" | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const autoPayRef = useRef(false);

  const order = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => orderService.detail(orderId),
    enabled: validId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING_PAYMENT" || status === "PAID" || status === "FULFILLING"
        ? 20_000
        : false;
    },
  });

  const orderData = order.data;

  const paymentQuery = useQuery({
    queryKey: queryKeys.payment(orderId),
    queryFn: () => paymentService.byOrder(orderId),
    enabled: validId && Boolean(orderData),
    staleTime: 10_000,
  });

  const fulfillments = useQuery({
    queryKey: queryKeys.fulfillments(orderId),
    queryFn: () => orderService.fulfillments(orderId),
    enabled:
      validId &&
      Boolean(orderData) &&
      ["PAID", "FULFILLING", "COMPLETED", "AFTER_SALE", "REFUNDED"].includes(
        orderData?.status ?? "",
      ),
  });

  useEffect(() => {
    if (paymentQuery.data) setPayment(paymentQuery.data);
  }, [paymentQuery.data]);

  const invalidateOrder = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.payment(orderId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.fulfillments(orderId) });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["staff"] });
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  }, [orderId, queryClient]);

  const startPayment = useCallback(async () => {
    if (!orderData || orderData.status !== "PENDING_PAYMENT") return;
    const existing = payment ?? paymentQuery.data;
    if (existing?.status === "SUCCESS") {
      void order.refetch();
      toast.info("订单已支付", "正在同步最新状态。");
      return;
    }
    if (existing?.status === "PENDING") {
      setPayment(existing);
      setPaymentOpen(true);
      return;
    }
    setPayLoading(true);
    try {
      const record = await paymentService.create(orderId);
      setPayment(record);
      void queryClient.setQueryData(queryKeys.payment(orderId), record);
      setPaymentOpen(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 4002) {
        toast.error("当前订单状态无法支付", "正在刷新订单。");
        void order.refetch();
      } else {
        toast.error("发起支付失败", getErrorMessage(error));
      }
    } finally {
      setPayLoading(false);
    }
  }, [order, orderData, orderId, payment, paymentQuery.data, queryClient]);

  useEffect(() => {
    if (searchParams.get("pay") !== "1" || autoPayRef.current) return;
    if (!orderData || !paymentQuery.isFetched) return;
    autoPayRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("pay");
    setSearchParams(next, { replace: true });
    if (orderData.status === "PENDING_PAYMENT") void startPayment();
  }, [orderData, paymentQuery.isFetched, searchParams, setSearchParams, startPayment]);

  const cancelMutation = useMutation({
    mutationFn: (cancelReason: string) =>
      orderService.cancel(orderId, cancelReason ? { reason: cancelReason } : undefined),
    onSuccess: () => {
      toast.success("订单已取消", "库存已由后端回补。");
      setActionDialog(null);
      setReason("");
      invalidateOrder();
    },
    onError: (error) => toast.error("取消订单失败", getErrorMessage(error)),
  });

  const afterSaleMutation = useMutation({
    mutationFn: (saleReason: string) =>
      orderService.afterSale(orderId, { reason: saleReason }),
    onSuccess: () => {
      toast.success("售后申请已提交", "店员会尽快联系你确认处理方式。");
      setActionDialog(null);
      setReason("");
      invalidateOrder();
    },
    onError: (error) => toast.error("提交售后申请失败", getErrorMessage(error)),
  });

  const closeActionDialog = () => {
    if (submitting) return;
    setActionDialog(null);
    setReason("");
  };

  const submitAction = async () => {
    if (!actionDialog) return;
    if (actionDialog === "after-sale" && !reason.trim()) {
      toast.error("请填写售后原因");
      return;
    }
    setSubmitting(true);
    try {
      if (actionDialog === "cancel") {
        await cancelMutation.mutateAsync(reason.trim());
      } else {
        await afterSaleMutation.mutateAsync(reason.trim());
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmPayment = async () => {
    if (!payment) return;
    setPaying(true);
    try {
      const record = await paymentService.mockCallback(payment.paymentNo);
      setPayment(record);
      setPaymentOpen(false);
      toast.success("支付完成", "花艺师马上开始准备。");
      invalidateOrder();
      void order.refetch();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 5003) {
          toast.info("订单已支付", "无需重复支付。");
          setPaymentOpen(false);
          invalidateOrder();
          void order.refetch();
        } else if (error.code === 4002 || error.code === 5002) {
          toast.error("当前状态无法完成支付", "正在刷新订单与支付状态。");
          setPaymentOpen(false);
          invalidateOrder();
          void order.refetch();
        } else {
          toast.error("支付未完成", error.message);
        }
      } else {
        toast.error("支付未完成", "请稍后重试。");
      }
    } finally {
      setPaying(false);
    }
  };

  if (!validId) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="订单不存在"
        description="链接中的订单编号无效。"
        action={<Button onClick={() => navigate("/orders")}>返回订单列表</Button>}
      />
    );
  }

  if (order.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
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
    const apiError = order.error instanceof ApiError ? order.error : null;
    const notFound = apiError?.code === 4001;
    if (notFound) {
      return (
        <EmptyState
          icon={FileQuestion}
          title="订单不存在"
          description="订单可能已被删除，或链接有误。"
          action={<Button onClick={() => navigate("/orders")}>返回订单列表</Button>}
        />
      );
    }
    return (
      <ErrorState
        title={apiError?.code === 4003 ? "无权查看该订单" : "订单没送到"}
        description={getErrorMessage(order.error)}
        onRetry={() => void order.refetch()}
      />
    );
  }

  if (!orderData) return null;

  const pending = orderData.status === "PENDING_PAYMENT";
  const completed = orderData.status === "COMPLETED";
  const canAfterSale = completed;
  const showFulfillment = ["PAID", "FULFILLING", "COMPLETED", "AFTER_SALE", "REFUNDED"].includes(
    orderData.status,
  );
  const unreviewedCount = orderData.items.filter((item) => !item.reviewed).length;
  const paymentRecord = payment ?? paymentQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回订单列表
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
        <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">订单详情</h1>
                <OrderStatusBadge status={orderData.status} label={orderData.statusLabel} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {statusHint[orderData.status]}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                下单于 {formatDateTime(orderData.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pending ? (
              <>
                <Button onClick={() => void startPayment()} loading={payLoading || paying}>
                  <CreditCard className="h-4 w-4" />
                  {paymentRecord?.status === "PENDING" ? "继续支付" : "立即支付"}
                </Button>
                <Button variant="outline" onClick={() => setActionDialog("cancel")}>
                  取消订单
                </Button>
              </>
            ) : null}
            {canAfterSale ? (
              <>
                <Button variant="outline" onClick={() => setActionDialog("after-sale")}>
                  <MessageSquareText className="h-4 w-4" />
                  申请售后
                </Button>
                {unreviewedCount > 0 ? (
                  <Button asChild>
                    <Link to={`/reviews?orderId=${orderData.id}`}>
                      <Star className="h-4 w-4" />
                      去评价（{unreviewedCount}）
                    </Link>
                  </Button>
                ) : null}
              </>
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
                共 {orderData.items.length} 种
              </span>
            </div>
            <ul className="divide-y divide-border/60">
              {orderData.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                  <Link to={`/products/${item.productId}`} className="shrink-0">
                    <ProductImage
                      src={item.productImage}
                      alt={item.productName}
                      seed={item.productName}
                      className="h-20 w-16 rounded-lg"
                      iconClassName="h-6 w-6"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/products/${item.productId}`}
                          className="line-clamp-1 text-sm font-medium hover:text-primary"
                        >
                          {item.productName}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.category}</span>
                          <span className="tabular">
                            {formatCurrency(item.unitPrice)} × {item.quantity}
                          </span>
                        </div>
                        {completed ? (
                          <div className="mt-2">
                            {item.reviewed ? (
                              <Badge variant="success">已评价</Badge>
                            ) : (
                              <Button size="sm" variant="outline" asChild>
                                <Link
                                  to={`/reviews?orderId=${orderData.id}&orderItemId=${item.id}`}
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  评价这件花礼
                                </Link>
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold tabular">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-border/60 bg-muted/20 px-5 py-3.5 text-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>商品总额</span>
                <span className="tabular">{formatCurrency(orderData.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">实付金额</span>
                <span className="text-base font-semibold tabular">
                  {formatCurrency(orderData.payAmount)}
                </span>
              </div>
            </div>
          </section>

          {showFulfillment ? (
            <section className="ui-card p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold tracking-tight">履约进度</h2>
                {fulfillments.isFetching ? (
                  <span className="text-[11px] text-muted-foreground">同步中…</span>
                ) : null}
              </div>
              {fulfillments.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : fulfillments.isError ? (
                <ErrorState
                  compact
                  title="履约轨迹暂时不可用"
                  description={getErrorMessage(fulfillments.error)}
                  onRetry={() => void fulfillments.refetch()}
                />
              ) : (
                <FulfillmentTimeline records={fulfillments.data ?? []} />
              )}
            </section>
          ) : null}

          <section className="ui-card p-5">
            <h2 className="text-base font-semibold tracking-tight">收货信息</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-[11px] text-muted-foreground">收货人</dt>
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
                  <dt className="text-[11px] text-muted-foreground">收货地址</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed">{orderData.receiverAddress}</dd>
                </div>
              </div>
            </dl>
            {orderData.remark || orderData.cancelReason || orderData.afterSaleReason ? (
              <div className="mt-4 space-y-2.5 border-t border-border/60 pt-4 text-sm">
                {orderData.remark ? (
                  <div>
                    <p className="text-[11px] text-muted-foreground">订单备注</p>
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
                  <div>
                    <p className="text-[11px] text-muted-foreground">售后原因</p>
                    <p className="mt-0.5 leading-relaxed">{orderData.afterSaleReason}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20">
          <section className="ui-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">支付信息</h2>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            {paymentQuery.isLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : paymentRecord ? (
              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">支付状态</dt>
                  <dd>
                    <PaymentStatusBadge
                      status={paymentRecord.status}
                      label={
                        dict.data?.paymentStatuses.find(
                          (item) => item.value === paymentRecord.status,
                        )?.label ?? paymentRecord.statusLabel
                      }
                    />
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">支付单号</dt>
                  <dd className="font-mono-ui break-all text-right text-[11px]">
                    {paymentRecord.paymentNo}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">支付渠道</dt>
                  <dd className="font-mono-ui">{paymentRecord.channel}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">支付金额</dt>
                  <dd className="font-semibold tabular">{formatCurrency(paymentRecord.amount)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">支付时间</dt>
                  <dd>{paymentRecord.paidAt ? formatDateTime(paymentRecord.paidAt) : "—"}</dd>
                </div>
              </dl>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border/70 px-3 py-4 text-center">
                <p className="text-sm">尚未发起支付</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  创建支付记录后会显示支付单号与渠道。
                </p>
              </div>
            )}
            {pending && paymentRecord?.status === "PENDING" ? (
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setPaymentOpen(true)}
              >
                继续完成支付
              </Button>
            ) : null}
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
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-sm">
              <span className="text-muted-foreground">实付金额</span>
              <span className="text-lg font-semibold tabular">
                {formatCurrency(orderData.payAmount)}
              </span>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              订单状态由后端实时返回，页面在待支付、待发货与配送中会自动刷新。
            </p>
          </section>
        </aside>
      </div>

      <Dialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        title="确认模拟支付"
        description="演示环境固定使用 MOCK 渠道，不会产生真实扣款。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={paying}>
              稍后再付
            </Button>
            <Button onClick={confirmPayment} loading={paying} data-autofocus>
              确认支付
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">订单号</span>
              <span className="font-mono-ui text-xs">{orderData.orderNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">支付单号</span>
              <span className="font-mono-ui text-xs">{payment?.paymentNo ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">支付渠道</span>
              <span className="font-mono-ui text-xs">{payment?.channel ?? "MOCK"}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span className="text-muted-foreground">支付金额</span>
              <span className="font-semibold tabular">
                ¥{formatMoney(payment?.amount ?? orderData.payAmount)}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            支付回调是幂等的；若订单已支付，重复操作不会重复扣款。
          </p>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(actionDialog)}
        onOpenChange={(open) => {
          if (!open) closeActionDialog();
        }}
        title={actionDialog === "cancel" ? "取消订单？" : "申请售后"}
        description={
          actionDialog === "cancel"
            ? "取消后库存会由后端回补，操作不可撤销。仅待支付订单可取消。"
            : "售后申请仅支持已完成的订单。请说明遇到的问题与期望处理方式。"
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeActionDialog} disabled={submitting}>
              再想想
            </Button>
            <Button
              variant={actionDialog === "cancel" ? "destructive" : "default"}
              onClick={submitAction}
              loading={submitting}
              disabled={actionDialog === "after-sale" && !reason.trim()}
            >
              {actionDialog === "cancel" ? "确认取消" : "提交申请"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="detail-reason">
            {actionDialog === "cancel" ? "取消原因（选填）" : "售后原因 *"}
          </Label>
          <Textarea
            id="detail-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={255}
            placeholder={
              actionDialog === "cancel" ? "例如：临时改变计划" : "请说明具体问题与期望处理方式"
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
