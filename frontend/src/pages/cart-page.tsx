import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Minus, Plus, ReceiptText, ShoppingBag, Trash2 } from "lucide-react";
import { useCartQuery } from "@/hooks/queries";
import { cartService } from "@/lib/services";
import { getErrorMessage, isAbortError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { CartItemVO } from "@/types/api";
import { ProductImage } from "@/components/domain/product-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function CartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const cart = useCartQuery();
  const [selected, setSelected] = useState<number[] | null>(() => {
    const raw = searchParams.get("selected");
    if (!raw) return null;
    return raw
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  });
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<CartItemVO | null>(null);

  const items = useMemo(() => cart.data ?? [], [cart.data]);
  const availableItems = useMemo(() => items.filter((item) => item.available), [items]);
  const availableIds = useMemo(() => availableItems.map((item) => item.id), [availableItems]);
  const effectiveSelected = useMemo(() => {
    if (selected === null) return availableIds;
    return selected.filter((id) => availableIds.includes(id));
  }, [selected, availableIds]);

  useEffect(() => {
    if (selected !== null) {
      const filtered = selected.filter((id) => availableIds.includes(id));
      if (filtered.length !== selected.length) setSelected(filtered);
    }
  }, [availableIds, selected]);

  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      cartService.update(id, { quantity }),
    onMutate: async ({ id, quantity }) => {
      setPendingId(id);
      await queryClient.cancelQueries({ queryKey: queryKeys.cart });
      const previous = queryClient.getQueryData<CartItemVO[]>(queryKeys.cart);
      queryClient.setQueryData<CartItemVO[]>(queryKeys.cart, (current) =>
        current?.map((item) =>
          item.id === id
            ? { ...item, quantity, subtotal: Number((item.price * quantity).toFixed(2)) }
            : item,
        ),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.cart, context.previous);
      }
      toast.error("数量更新失败", getErrorMessage(error));
    },
    onSettled: () => {
      setPendingId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => cartService.remove(id),
    onSuccess: (_, id) => {
      toast.success("已从购物车移除");
      setSelected((current) => (current ? current.filter((itemId) => itemId !== id) : current));
      setRemoveTarget(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
    onError: (error) => toast.error("移除失败", getErrorMessage(error)),
  });

  const clearMutation = useMutation({
    mutationFn: cartService.clear,
    onSuccess: () => {
      toast.success("购物车已清空", "去挑一束当季的花吧。");
      setSelected([]);
      setClearOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
    onError: (error) => toast.error("清空失败", getErrorMessage(error)),
  });

  const selectedItems = availableItems.filter((item) => effectiveSelected.includes(item.id));
  const selectedCount = selectedItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = selectedItems.reduce((total, item) => total + item.subtotal, 0);
  const allSelected = availableItems.length > 0 && effectiveSelected.length === availableItems.length;

  const toggleItem = (id: number) => {
    const base = selected === null ? availableIds : selected;
    setSelected(base.includes(id) ? base.filter((item) => item !== id) : [...base, id]);
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : availableIds);
  };

  const changeQuantity = (item: CartItemVO, next: number) => {
    const max = Math.min(99, item.stock);
    const quantity = Math.min(max, Math.max(1, next));
    if (quantity === item.quantity) return;
    updateMutation.mutate({ id: item.id, quantity });
  };

  const goCheckout = () => {
    if (effectiveSelected.length === 0) return;
    navigate(`/checkout?items=${effectiveSelected.join(",")}`);
  };

  if (cart.isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="ui-card p-4">
          <TableSkeleton rows={3} />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (cart.isError) {
    if (isAbortError(cart.error)) return null;
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
        icon={ShoppingBag}
        title="购物车还是空的，今天想送谁花？"
        description="去挑一束当季花礼，让花艺师替你整理好。"
        action={
          <Button onClick={() => navigate("/products")}>
            <ShoppingBag className="h-4 w-4" />
            去挑花
          </Button>
        }
        className="py-24"
      />
    );
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <Checkbox checked={allSelected} indeterminate={effectiveSelected.length > 0 && !allSelected} onChange={toggleAll} />
            全选
            <span className="text-muted-foreground">（{availableItems.length} 件可结算）</span>
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setClearOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            清空购物车
          </Button>
        </div>

        <ul className="divide-y divide-border/60">
          {items.map((item) => {
            const checked = effectiveSelected.includes(item.id);
            const max = Math.min(99, item.stock);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex flex-wrap items-start gap-3 px-4 py-4 transition-colors sm:flex-nowrap",
                  !item.available && "bg-destructive/[0.03]",
                )}
              >
                <div className="pt-8 sm:pt-9">
                  <Checkbox
                    checked={checked}
                    disabled={!item.available}
                    onChange={() => toggleItem(item.id)}
                    aria-label={`选择 ${item.productName}`}
                  />
                </div>
                <Link to={`/products/${item.productId}`} className="shrink-0">
                  <ProductImage
                    src={item.productImage}
                    alt={item.productName}
                    seed={item.productName}
                    className="h-24 w-20 rounded-lg sm:h-28 sm:w-24"
                    iconClassName="h-7 w-7"
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
                        <span className="tabular">{formatCurrency(item.price)}</span>
                        <Badge variant={item.available ? "secondary" : "destructive"}>
                          {item.available ? `库存 ${item.stock}` : "不可结算"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`移除 ${item.productName}`}
                      onClick={() => setRemoveTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>

                  {!item.available ? (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      商品已下架或库存不足以购买当前数量，请调整数量或移除后再结算。
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex h-9 items-center rounded-md border border-border">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="减少数量"
                        className="h-8 w-8 rounded-none"
                        disabled={!item.available || item.quantity <= 1 || pendingId === item.id}
                        onClick={() => changeQuantity(item, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-9 text-center text-xs font-medium tabular">
                        {pendingId === item.id ? (
                          <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="增加数量"
                        className="h-8 w-8 rounded-none"
                        disabled={!item.available || item.quantity >= max || pendingId === item.id}
                        onClick={() => changeQuantity(item, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">小计</p>
                      <p className="text-sm font-semibold tabular">{formatCurrency(item.subtotal)}</p>
                    </div>
                  </div>
                  {item.available && item.stock < item.quantity ? (
                    <p className="mt-1 text-[11px] text-warning">当前库存仅 {item.stock} 件，请调整数量。</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="ui-card sticky top-20 p-5">
        <h2 className="text-base font-semibold tracking-tight">订单摘要</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">已选商品</dt>
            <dd className="tabular">{selectedItems.length} 种 · {selectedCount} 件</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">商品小计</dt>
            <dd className="tabular">{formatCurrency(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
            <dt className="font-medium">预计合计</dt>
            <dd className="text-lg font-semibold tabular">{formatCurrency(subtotal)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          没有配送费或优惠接口，最终金额以下单结果为准。
        </p>
        <Button
          className="mt-4 w-full"
          disabled={effectiveSelected.length === 0}
          onClick={goCheckout}
        >
          <ReceiptText className="h-4 w-4" />
          去结算
        </Button>
        {effectiveSelected.length === 0 ? (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            请先选择至少一件可结算的花礼。
          </p>
        ) : null}
      </aside>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="清空购物车？"
        description="清空后当前购物车中的花礼都会被移除，订单和收藏不受影响。"
        confirmText="清空购物车"
        destructive
        loading={clearMutation.isPending}
        onConfirm={() => clearMutation.mutate()}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="移除这件花礼？"
        description={removeTarget ? `“${removeTarget.productName}”会从购物车移除，可稍后重新加入。` : ""}
        confirmText="移除"
        destructive
        loading={removeMutation.isPending}
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget.id);
        }}
      />
    </div>
  );
}
