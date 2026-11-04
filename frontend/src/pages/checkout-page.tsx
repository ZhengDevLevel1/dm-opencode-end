import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { useCartQuery } from "@/hooks/queries";
import { useAuthStore } from "@/stores/auth";
import { orderService, paymentService } from "@/lib/services";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { CartItemVO, OrderVO, PaymentVO } from "@/types/api";
import { ProductImage } from "@/components/domain/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  receiverName: z.string().trim().min(1, "请填写收货人").max(50, "收货人最多 50 个字符"),
  receiverPhone: z
    .string()
    .trim()
    .regex(/^1[3-9]\d{9}$/, "请输入中国大陆手机号"),
  receiverAddress: z
    .string()
    .trim()
    .min(1, "请填写收货地址")
    .max(255, "地址最多 255 个字符"),
  remark: z.string().max(255, "备注最多 255 个字符").optional(),
});

type FormValues = z.infer<typeof schema>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const cart = useCartQuery();
  const [snapshot, setSnapshot] = useState<CartItemVO[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<PaymentVO | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<OrderVO | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const paymentRef = useRef<PaymentVO | null>(null);

  useEffect(() => {
    paymentRef.current = payment;
  }, [payment]);

  const initialItems = useMemo(() => {
    const raw = searchParams.get("items");
    const available = (cart.data ?? []).filter((item) => item.available);
    if (!raw) return available;
    const ids = raw
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    return available.filter((item) => ids.includes(item.id));
  }, [cart.data, searchParams]);

  useEffect(() => {
    if (!snapshot && initialItems.length > 0) setSnapshot(initialItems);
  }, [initialItems, snapshot]);

  const items = snapshot ?? initialItems;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      receiverName: user?.nickname || user?.username || "",
      receiverPhone: user?.phone || "",
      receiverAddress: "",
      remark: "",
    },
  });

  const subtotalCents = items.reduce(
    (total, item) => total + Math.round(item.subtotal * 100),
    0,
  );
  const totalCents = subtotalCents;

  const invalidateAfterOrder = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["order"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["product"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.hotProducts });
    void queryClient.invalidateQueries({ queryKey: ["staff"] });
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const handleCreateOrder = async (values: FormValues) => {
    if (createdOrder) {
      navigate(`/orders/${createdOrder.id}`);
      return;
    }
    if (items.length === 0) {
      toast.error("没有可结算的花礼", "请回到购物车重新选择。");
      return;
    }
    setSubmitting(true);
    setPaymentError("");
    let order: OrderVO | null = null;
    try {
      order = await orderService.create({
        cartItemIds: items.map((item) => item.id),
        receiverName: values.receiverName.trim(),
        receiverPhone: values.receiverPhone.trim(),
        receiverAddress: values.receiverAddress.trim(),
        remark: values.remark?.trim() || undefined,
      });
      setCreatedOrder(order);
      invalidateAfterOrder();
      try {
        const paymentRecord = await paymentService.create(order.id);
        setPayment(paymentRecord);
        setPaymentOpen(true);
      } catch (error) {
        setPaymentError(getErrorMessage(error));
        toast.error("订单已创建，但支付未发起", "可以在订单详情中重试支付。");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 3002) {
          toast.error("购物车为空", "请返回购物车重新选择花礼。");
          navigate("/cart");
        } else if (error.code === 2002) {
          toast.error("花礼已下架", "请返回购物车调整后再下单。");
          navigate("/cart");
        } else if (error.code === 2003) {
          toast.error("库存不足", error.message);
          navigate("/cart");
        } else if (error.code === 3001) {
          toast.error("购物车已变化", "正在刷新购物车，请重新确认。");
          void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
        } else {
          toast.error("下单失败", error.message);
        }
      } else {
        toast.error("下单失败", "数据没送到，请稍后重试。");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payment) return;
    setPaying(true);
    try {
      await paymentService.mockCallback(payment.paymentNo);
      toast.success("支付完成", "花艺师马上开始准备。");
      setPaymentOpen(false);
      invalidateAfterOrder();
      if (createdOrder) {
        navigate(`/orders/${createdOrder.id}?paid=1`, { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 5003) {
          toast.info("订单已支付", "无需重复支付，正在前往订单详情。");
          setPaymentOpen(false);
          if (createdOrder) navigate(`/orders/${createdOrder.id}`, { replace: true });
        } else if (error.code === 4002) {
          toast.error("订单状态不允许支付", "正在刷新订单状态。");
          setPaymentOpen(false);
          if (createdOrder) navigate(`/orders/${createdOrder.id}`, { replace: true });
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

  const closePayment = () => {
    setPaymentOpen(false);
    if (createdOrder) {
      navigate(`/orders/${createdOrder.id}`, { replace: true });
    }
  };

  if (cart.isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (cart.isError) {
    return (
      <ErrorState
        description={getErrorMessage(cart.error)}
        onRetry={() => void cart.refetch()}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="没有可结算的花礼"
        description="所选花礼可能已下架或库存不足，请回到购物车重新选择。"
        action={
          <Button onClick={() => navigate("/cart")}>
            <ArrowLeft className="h-4 w-4" />
            返回购物车
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/cart")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          返回购物车修改
        </Button>
        <Badge variant="secondary">
          <ShieldCheck className="h-3 w-3" />
          模拟支付 · 渠道 MOCK
        </Badge>
      </div>

      {paymentError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">订单已创建，但支付发起失败</p>
              <p className="text-xs text-muted-foreground">{paymentError}</p>
            </div>
          </div>
          {createdOrder ? (
            <Button size="sm" variant="outline" onClick={() => navigate(`/orders/${createdOrder.id}`)}>
              去订单详情重试支付
            </Button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(handleCreateOrder)} noValidate>
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className="ui-card p-5">
              <h2 className="text-base font-semibold tracking-tight">收货信息</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                地址只在本次订单中提交，系统没有地址簿。
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="receiverName">收货人 *</Label>
                  <Input
                    id="receiverName"
                    placeholder="收货人姓名"
                    aria-invalid={Boolean(errors.receiverName)}
                    {...register("receiverName")}
                  />
                  {errors.receiverName ? (
                    <p className="text-xs text-destructive">{errors.receiverName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="receiverPhone">联系电话 *</Label>
                  <Input
                    id="receiverPhone"
                    inputMode="tel"
                    placeholder="11 位手机号"
                    aria-invalid={Boolean(errors.receiverPhone)}
                    {...register("receiverPhone")}
                  />
                  {errors.receiverPhone ? (
                    <p className="text-xs text-destructive">{errors.receiverPhone.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="receiverAddress">收货地址 *</Label>
                  <Textarea
                    id="receiverAddress"
                    placeholder="省市区 + 详细地址"
                    className="min-h-20"
                    aria-invalid={Boolean(errors.receiverAddress)}
                    {...register("receiverAddress")}
                  />
                  {errors.receiverAddress ? (
                    <p className="text-xs text-destructive">{errors.receiverAddress.message}</p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="remark">订单备注</Label>
                  <Textarea
                    id="remark"
                    placeholder="选填，例如送达前电话联系"
                    className="min-h-16"
                    {...register("remark")}
                  />
                  {errors.remark ? (
                    <p className="text-xs text-destructive">{errors.remark.message}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="ui-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                <h2 className="text-base font-semibold tracking-tight">花礼清单</h2>
                <span className="text-xs text-muted-foreground">共 {items.length} 种花礼</span>
              </div>
              <ul className="divide-y divide-border/60">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <ProductImage
                      src={item.productImage}
                      alt={item.productName}
                      seed={item.productName}
                      className="h-14 w-12 shrink-0 rounded-md"
                      iconClassName="h-5 w-5"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/products/${item.productId}`}
                        className="line-clamp-1 text-sm font-medium hover:text-primary"
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="ui-card sticky top-20 p-5">
            <h2 className="text-base font-semibold tracking-tight">金额摘要</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">商品小计</dt>
                <dd className="tabular">{formatCurrency(subtotalCents / 100)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">商品件数</dt>
                <dd className="tabular">
                  {items.reduce((total, item) => total + item.quantity, 0)} 件
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                <dt className="font-medium">预计合计</dt>
                <dd className="text-lg font-semibold tabular">
                  {formatCurrency(totalCents / 100)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              没有配送费、优惠或积分接口。最终金额以下单结果为准。
            </p>
            <Button type="submit" className="mt-4 w-full" loading={submitting} disabled={Boolean(createdOrder)}>
              <CreditCard className="h-4 w-4" />
              {createdOrder ? "订单已创建" : "提交订单并支付"}
            </Button>
            {createdOrder ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => navigate(`/orders/${createdOrder.id}`)}
              >
                查看已创建的订单
              </Button>
            ) : null}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              提交后会先创建订单，再发起模拟支付。
            </p>
          </aside>
        </div>
      </form>

      <Dialog
        open={paymentOpen}
        onOpenChange={(open) => {
          if (!open) closePayment();
        }}
        title="确认模拟支付"
        description="当前为演示环境，支付渠道固定为 MOCK，不会产生真实扣款。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closePayment} disabled={paying}>
              稍后支付
            </Button>
            <Button onClick={handleConfirmPayment} loading={paying} data-autofocus>
              确认支付
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">订单号</span>
              <span className="font-mono-ui text-xs">{createdOrder?.orderNo ?? "—"}</span>
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
                ¥{formatMoney(payment?.amount ?? totalCents / 100)}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            关闭弹窗后订单会保留为「待支付」，可以稍后在订单详情中重新发起支付。
          </p>
        </div>
      </Dialog>
    </div>
  );
}
