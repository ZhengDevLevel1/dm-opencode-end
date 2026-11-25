import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  MapPin,
  MapPinned,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAddressesQuery, useBusinessHoursQuery, useCartQuery } from "@/hooks/queries";
import { orderService, paymentService } from "@/lib/services";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { defaultDeliverySelection, deliveryWindowError, toDeliveryAt } from "@/lib/business-hours";
import { formatCurrency, formatMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { AddressVO, CartItemVO, OrderVO, PaymentVO } from "@/types/api";
import { AddressDialog } from "@/components/domain/address-dialog";
import { DeliveryTimePicker } from "@/components/domain/delivery-time-picker";
import { GreetingCardEditor } from "@/components/domain/greeting-card-editor";
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

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const cart = useCartQuery();
  const addresses = useAddressesQuery();
  const hoursQuery = useBusinessHoursQuery();
  const hours = useMemo(() => hoursQuery.data ?? [], [hoursQuery.data]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [greeting, setGreeting] = useState(() => {
    try {
      return sessionStorage.getItem("flower.greetingCard") ?? "";
    } catch {
      return "";
    }
  });
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [snapshot, setSnapshot] = useState<CartItemVO[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<PaymentVO | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<OrderVO | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const paymentRef = useRef<PaymentVO | null>(null);
  const pendingAddressId = useRef<number | null>(null);

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

  const addressList = useMemo(() => addresses.data ?? [], [addresses.data]);
  const filteredAddressList = useMemo(() => {
    const query = addressQuery.trim().toLowerCase();
    if (!query) return addressList;
    return addressList.filter((address) =>
      [address.label, address.receiverName, address.receiverPhone, address.fullAddress].some(
        (value) => value?.toLowerCase().includes(query),
      ),
    );
  }, [addressList, addressQuery]);

  useEffect(() => {
    if (pendingAddressId.current != null) {
      if (addressList.some((address) => address.id === pendingAddressId.current)) {
        setSelectedAddressId(pendingAddressId.current);
        pendingAddressId.current = null;
      }
      return;
    }
    if (addressList.length === 0) {
      setSelectedAddressId(null);
      return;
    }
    if (selectedAddressId && addressList.some((address) => address.id === selectedAddressId)) {
      return;
    }
    const fallback = addressList.find((address) => address.isDefault) ?? addressList[0];
    setSelectedAddressId(fallback.id);
  }, [addressList, selectedAddressId]);

  const items = snapshot ?? initialItems;
  const selectedAddress =
    addressList.find((address) => address.id === selectedAddressId) ?? null;
  const deliveryError =
    deliveryDate && deliveryTime ? deliveryWindowError(deliveryDate, deliveryTime, hours) : null;

  useEffect(() => {
    if (hours.length === 0) return;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem("flower.deliveryAt");
    } catch {
      stored = null;
    }
    if (stored) {
      const [date, time] = stored.split("T");
      if (date && time && !deliveryWindowError(date, time.slice(0, 5), hours)) {
        setDeliveryDate(date);
        setDeliveryTime(time.slice(0, 5));
        return;
      }
    }
    const fallback = defaultDeliverySelection(hours);
    setDeliveryDate(fallback.date);
    setDeliveryTime(fallback.time);
  }, [hours]);

  useEffect(() => {
    try {
      if (greeting.trim()) sessionStorage.setItem("flower.greetingCard", greeting);
      else sessionStorage.removeItem("flower.greetingCard");
    } catch {
      /* storage unavailable */
    }
  }, [greeting]);

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

  const handleCreateOrder = async () => {
    if (createdOrder) {
      navigate(`/orders/${createdOrder.id}`);
      return;
    }
    if (items.length === 0) {
      toast.error("没有可结算的花礼", "请回到购物车重新选择。");
      return;
    }
    if (!selectedAddress) {
      toast.error("请选择收货地址", "可以新增地址或到地址簿管理常用地址。");
      return;
    }
    if (!deliveryDate || !deliveryTime) {
      toast.error("请选择送达时间", "花艺师需要提前 1 小时备花。");
      return;
    }
    if (deliveryError) {
      toast.error("送达时间不可用", deliveryError);
      return;
    }
    setSubmitting(true);
    setPaymentError("");
    let order: OrderVO | null = null;
    try {
      order = await orderService.create({
        cartItemIds: items.map((item) => item.id),
        addressId: selectedAddress.id,
        receiverName: selectedAddress.receiverName,
        receiverPhone: selectedAddress.receiverPhone,
        receiverAddress: selectedAddress.fullAddress,
        receiverLongitude: selectedAddress.longitude,
        receiverLatitude: selectedAddress.latitude,
        greetingCard: greeting.trim() || undefined,
        deliveryAt: toDeliveryAt(deliveryDate, deliveryTime),
        remark: remark.trim() || undefined,
      });
      setCreatedOrder(order);
      try {
        sessionStorage.removeItem("flower.greetingCard");
        sessionStorage.removeItem("flower.deliveryAt");
      } catch {
        /* storage unavailable */
      }
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
        } else if (error.code === 9001) {
          toast.error("收货地址已失效", "请重新选择地址。");
          void queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreateOrder();
        }}
        noValidate
      >
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <section className="ui-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">收货信息</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    搜索并选择送达地址，地图选点会随订单同步给履约工作台。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/addresses">
                      <MapPinned className="h-3.5 w-3.5" />
                      管理地址
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAddressDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增地址
                  </Button>
                </div>
              </div>

              {addresses.isLoading ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </div>
              ) : addresses.isError ? (
                <div className="mt-4">
                  <ErrorState
                    compact
                    title="地址簿暂时不可用"
                    description={getErrorMessage(addresses.error)}
                    onRetry={() => void addresses.refetch()}
                  />
                </div>
              ) : addressList.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
                  <MapPinned className="mx-auto h-7 w-7 text-muted-foreground opacity-50" />
                  <p className="mt-2 text-sm font-medium">还没有收货地址</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    新增一个常用地址后即可提交订单。
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => setAddressDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增收货地址
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="checkout-address-search"
                        value={addressQuery}
                        onChange={(event) => setAddressQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.preventDefault();
                          if (event.key === "Escape") setAddressQuery("");
                        }}
                        placeholder="搜索收货人、电话或地址"
                        aria-label="搜索收货地址"
                        autoComplete="off"
                        className="h-9 pr-9 pl-9 text-sm"
                      />
                      {addressQuery ? (
                        <button
                          type="button"
                          onClick={() => setAddressQuery("")}
                          aria-label="清空地址搜索"
                          className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular">
                      {filteredAddressList.length}/{addressList.length}
                    </span>
                  </div>

                  {filteredAddressList.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-border/70 px-4 py-6 text-center">
                      <p className="text-sm font-medium">没有匹配的收货地址</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        换个关键词试试，或清空搜索查看全部地址。
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setAddressQuery("")}
                      >
                        清空搜索
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 max-h-[18rem] overflow-y-auto overscroll-contain pr-1">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredAddressList.map((address) => (
                          <AddressOptionCard
                            key={address.id}
                            address={address}
                            selected={address.id === selectedAddressId}
                            onSelect={() => setSelectedAddressId(address.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedAddress ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="break-all">{selectedAddress.fullAddress}</span>
                  {typeof selectedAddress.longitude === "number" &&
                  typeof selectedAddress.latitude === "number" ? (
                    <Badge variant="secondary" className="ml-auto">
                      已标注地图
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto">
                      未标注地图
                    </Badge>
                  )}
                </div>
              ) : null}

              <div className="mt-5 space-y-4 border-t border-border/60 pt-4">
                <DeliveryTimePicker
                  value={{ date: deliveryDate, time: deliveryTime }}
                  hours={hours}
                  onChange={(next) => {
                    setDeliveryDate(next.date);
                    setDeliveryTime(next.time);
                  }}
                />
                {deliveryError ? (
                  <p className="text-[11px] text-destructive">{deliveryError}</p>
                ) : deliveryDate && deliveryTime ? (
                  <p className="text-[11px] text-muted-foreground">
                    已选 {deliveryDate} {deliveryTime}，花艺师会提前完成打包。
                  </p>
                ) : null}
                <div className="rounded-2xl border border-border/60 bg-card p-3.5">
                  <GreetingCardEditor value={greeting} onChange={setGreeting} compact />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="remark">订单备注</Label>
                <Textarea
                  id="remark"
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  maxLength={255}
                  placeholder="选填，例如送达前电话联系"
                  className="min-h-16"
                />
                <p className="text-right text-[11px] text-muted-foreground tabular">
                  {remark.length}/255
                </p>
              </div>
            </section>

            <section className="ui-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                <h2 className="text-base font-semibold tracking-tight">花礼清单</h2>
                <span className="text-xs text-muted-foreground">共 {items.length} 种花礼</span>
              </div>
              <ul className="max-h-[22rem] divide-y divide-border/60 overflow-y-auto overscroll-contain">
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
            <Button
              type="submit"
              className="mt-4 w-full"
              loading={submitting}
              disabled={Boolean(createdOrder) || !selectedAddress || addresses.isLoading}
            >
              <CreditCard className="h-4 w-4" />
              {createdOrder ? "订单已创建" : "提交订单并支付"}
            </Button>
            {!selectedAddress && !addresses.isLoading ? (
              <p className="mt-2 text-center text-[11px] text-warning">
                请先选择或新增收货地址。
              </p>
            ) : null}
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

      <AddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onSaved={(saved) => {
          pendingAddressId.current = saved.id;
          setSelectedAddressId(saved.id);
          setAddressQuery("");
        }}
      />

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

interface AddressOptionCardProps {
  address: AddressVO;
  selected: boolean;
  onSelect: () => void;
}

function AddressOptionCard({ address, selected, onSelect }: AddressOptionCardProps) {
  const hasCoordinate =
    typeof address.longitude === "number" && typeof address.latitude === "number";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow]",
        selected
          ? "border-primary bg-primary/[0.06] ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{address.label || "家"}</Badge>
          {address.isDefault ? <Badge>默认</Badge> : null}
        </div>
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-primary bg-primary" : "border-border",
          )}
          aria-hidden
        >
          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-primary-solid-foreground" /> : null}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium">
        {address.receiverName}
        <span className="ml-2 text-[11px] font-normal text-muted-foreground tabular">
          {address.receiverPhone}
        </span>
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {address.fullAddress}
      </p>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3" />
        {hasCoordinate ? "已标注配送地图" : "未标注地图坐标"}
      </p>
    </button>
  );
}
