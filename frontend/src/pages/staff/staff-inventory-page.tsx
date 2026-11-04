import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Minus,
  PackageOpen,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { productService, staffService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useDict } from "@/hooks/queries";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast";
import type {
  InventoryChangeType,
  InventoryQuery,
  InventoryRecord,
  ProductVO,
} from "@/types/api";
import {
  inventoryChangeLabel,
  inventoryChangeVariant,
} from "@/components/domain/status-badge";
import { ProductImage } from "@/components/domain/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const PAGE_SIZE = 20;

interface Filters {
  productId: string;
  changeType: string;
  orderNo: string;
  start: string;
  end: string;
}

const emptyFilters: Filters = {
  productId: "",
  changeType: "",
  orderNo: "",
  start: "",
  end: "",
};

type AdjustMode = "increase" | "decrease";

interface AdjustState {
  product: ProductVO | null;
  mode: AdjustMode;
  quantity: string;
  remark: string;
  loadingProduct: boolean;
}

const emptyAdjust: AdjustState = {
  product: null,
  mode: "increase",
  quantity: "1",
  remark: "",
  loadingProduct: false,
};

function buildQuery(filters: Filters, page: number): InventoryQuery {
  const query: InventoryQuery = { page, size: PAGE_SIZE };
  const productId = Number(filters.productId);
  if (filters.productId.trim() && Number.isInteger(productId) && productId > 0) {
    query.productId = productId;
  }
  if (filters.changeType) query.changeType = filters.changeType as InventoryChangeType;
  if (filters.orderNo.trim()) query.orderNo = filters.orderNo.trim();
  if (filters.start) query.start = `${filters.start}T00:00:00`;
  if (filters.end) query.end = `${filters.end}T23:59:59`;
  return query;
}

export function StaffInventoryPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const dict = useDict();
  const [draft, setDraft] = useState<Filters>(() => ({
    ...emptyFilters,
    productId: searchParams.get("productId") ?? "",
  }));
  const [filters, setFilters] = useState<Filters>(draft);
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjust, setAdjust] = useState<AdjustState>(emptyAdjust);
  const [productKeyword, setProductKeyword] = useState("");
  const [adjustError, setAdjustError] = useState("");

  const query = useQuery({
    queryKey: queryKeys.staffInventory({ ...filters, page, size: PAGE_SIZE }),
    queryFn: () => staffService.inventory(buildQuery(filters, page)),
    placeholderData: keepPreviousData,
  });

  const productSearch = useQuery({
    queryKey: queryKeys.products({
      page: 1,
      size: 20,
      keyword: productKeyword.trim(),
      status: "ON_SALE",
    }),
    queryFn: () =>
      productService.list({
        page: 1,
        size: 20,
        keyword: productKeyword.trim() || undefined,
      }),
    enabled: adjustOpen && productKeyword.trim().length > 0,
    staleTime: 30_000,
  });

  const changeTypes = dict.data?.inventoryChangeTypes ?? [];

  const adjustMutation = useMutation({
    mutationFn: (payload: { product: ProductVO; delta: number; remark?: string }) =>
      staffService.adjustStock(payload.product.id, {
        delta: payload.delta,
        remark: payload.remark,
      }),
    onSuccess: (record) => {
      toast.success(
        "库存已调整",
        `${record.productName}：${record.stockBefore} → ${record.stockAfter} 件。`,
      );
      setAdjustOpen(false);
      setAdjust(emptyAdjust);
      setAdjustError("");
      void queryClient.invalidateQueries({ queryKey: ["staff", "inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      setAdjustError(getErrorMessage(error));
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const quantity = Number(adjust.quantity);
  const validQuantity =
    adjust.quantity.trim() !== "" && Number.isInteger(quantity) && quantity > 0;
  const previewStock = adjust.product
    ? adjust.mode === "increase"
      ? adjust.product.stock + (validQuantity ? quantity : 0)
      : adjust.product.stock - (validQuantity ? quantity : 0)
    : 0;
  const wouldGoNegative = Boolean(adjust.product) && previewStock < 0;

  const openAdjust = (product?: ProductVO) => {
    setAdjust({ ...emptyAdjust, product: product ?? null });
    setProductKeyword("");
    setAdjustError("");
    setAdjustOpen(true);
  };

  const openAdjustForRecord = async (record: InventoryRecord) => {
    setAdjust({
      ...emptyAdjust,
      product: null,
      mode: record.stockAfter < 10 ? "increase" : "decrease",
      loadingProduct: true,
    });
    setProductKeyword("");
    setAdjustError("");
    setAdjustOpen(true);
    try {
      const product = await productService.detail(record.productId);
      setAdjust((current) => ({ ...current, product, loadingProduct: false }));
    } catch (error) {
      setAdjust((current) => ({ ...current, loadingProduct: false }));
      setAdjustError(
        `${getErrorMessage(error)}。该商品可能已下架，无法通过公开商品接口读取当前库存；请从商品搜索结果中选择。`,
      );
    }
  };

  const submitAdjust = () => {
    setAdjustError("");
    if (!adjust.product) {
      setAdjustError("请先选择要调整库存的商品。");
      return;
    }
    if (!validQuantity) {
      setAdjustError("调整数量必须是大于 0 的整数。");
      return;
    }
    if (adjust.remark.trim().length > 200) {
      setAdjustError("备注最多 200 个字符。");
      return;
    }
    if (wouldGoNegative) {
      setAdjustError("调整后库存不能小于 0。");
      return;
    }
    const delta = adjust.mode === "increase" ? quantity : -quantity;
    adjustMutation.mutate({
      product: adjust.product,
      delta,
      remark: adjust.remark.trim() || undefined,
    });
  };

  const records = query.data?.records ?? [];
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value.trim() !== "").length,
    [filters],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">库存管理</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            查看库存变动流水，并对商品执行人工入库或扣减。库存低于 10 件的记录会标红。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <History className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} />
            刷新
          </Button>
          <Button size="sm" onClick={() => openAdjust()}>
            <Plus className="h-3.5 w-3.5" />
            库存调整
          </Button>
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            筛选流水
          </h2>
          {activeFilterCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground"
              onClick={() => {
                setDraft(emptyFilters);
                setFilters(emptyFilters);
                setPage(1);
              }}
            >
              <X className="h-3 w-3" />
              清除 {activeFilterCount} 项
            </Button>
          ) : null}
        </div>
        <form
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-12"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters(draft);
            setPage(1);
          }}
        >
          <div className="xl:col-span-2">
            <Label htmlFor="inventory-product" className="sr-only">
              商品 ID
            </Label>
            <Input
              id="inventory-product"
              value={draft.productId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, productId: event.target.value }))
              }
              placeholder="商品 ID"
              inputMode="numeric"
              className="h-9 text-xs"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="inventory-type" className="sr-only">
              变动类型
            </Label>
            <CustomSelect
              id="inventory-type"
              value={draft.changeType}
              onChange={(next) =>
                setDraft((current) => ({ ...current, changeType: next }))
              }
              options={changeTypes}
              placeholder="全部变动类型"
              className="h-9 text-xs"
            />
          </div>
          <div className="xl:col-span-3">
            <Label htmlFor="inventory-order" className="sr-only">
              订单号
            </Label>
            <Input
              id="inventory-order"
              value={draft.orderNo}
              onChange={(event) =>
                setDraft((current) => ({ ...current, orderNo: event.target.value }))
              }
              placeholder="订单号精确匹配"
              className="h-9 text-xs"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="inventory-start" className="sr-only">
              开始日期
            </Label>
            <DatePicker
              id="inventory-start"
              value={draft.start}
              onChange={(next) => setDraft((current) => ({ ...current, start: next }))}
              placeholder="开始日期"
              className="h-9 text-xs"
              aria-label="开始日期"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="inventory-end" className="sr-only">
              结束日期
            </Label>
            <DatePicker
              id="inventory-end"
              value={draft.end}
              onChange={(next) => setDraft((current) => ({ ...current, end: next }))}
              placeholder="结束日期"
              className="h-9 text-xs"
              aria-label="结束日期"
            />
          </div>
          <div className="flex gap-2 xl:col-span-1">
            <Button type="submit" size="sm" className="h-9 flex-1">
              <Search className="h-3.5 w-3.5" />
              筛选
            </Button>
          </div>
        </form>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PackageOpen className="h-3.5 w-3.5" />
            共 {formatNumber(query.data?.total)} 条变动记录
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
            变动后库存 &lt; 10
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="库存流水没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={activeFilterCount > 0 ? "没有符合筛选条件的记录" : "还没有库存变动记录"}
            description={
              activeFilterCount > 0
                ? "试试清除部分筛选条件，或换一个商品 ID / 订单号。"
                : "商品建档、下单扣减、取消回补和人工调整都会在这里留下记录。"
            }
            bare
            action={
              activeFilterCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft(emptyFilters);
                    setFilters(emptyFilters);
                    setPage(1);
                  }}
                >
                  清除筛选
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>商品</TH>
                  <TH>变动</TH>
                  <TH>变动前</TH>
                  <TH>变动后</TH>
                  <TH>关联订单</TH>
                  <TH>操作人</TH>
                  <TH>时间</TH>
                  <TH className="text-right">操作</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((record) => {
                  const negative = record.changeQuantity < 0;
                  const low = record.stockAfter < 10;
                  const label =
                    changeTypes.find((item) => item.value === record.changeType)?.label ??
                    inventoryChangeLabel[record.changeType];
                  return (
                    <TR key={record.id}>
                      <TD className="min-w-52 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <ProductImage
                            src={undefined}
                            alt={record.productName}
                            seed={`${record.productId}`}
                            className="h-8 w-8 shrink-0 rounded-md"
                            iconClassName="h-4 w-4"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{record.productName}</p>
                            <p className="text-[10px] text-muted-foreground tabular">
                              #{record.productId}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={inventoryChangeVariant[record.changeType]}>{label}</Badge>
                          <span
                            className={cn(
                              "text-[11px] font-medium tabular",
                              negative ? "text-destructive" : "text-emerald-600",
                            )}
                          >
                            {negative ? "" : "+"}
                            {formatNumber(record.changeQuantity)}
                          </span>
                        </div>
                      </TD>
                      <TD className="text-xs tabular text-muted-foreground">
                        {formatNumber(record.stockBefore)}
                      </TD>
                      <TD>
                        <span className={cn("text-xs font-medium tabular", low && "text-destructive")}>
                          {formatNumber(record.stockAfter)}
                        </span>
                        {low ? (
                          <Badge variant="destructive" className="ml-1.5">
                            低库存
                          </Badge>
                        ) : null}
                      </TD>
                      <TD>
                        {record.orderNo ? (
                          <Link
                            to={`/staff/orders?keyword=${encodeURIComponent(record.orderNo)}`}
                            className="font-mono-ui text-[11px] text-primary hover:underline"
                          >
                            {record.orderNo}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD className="text-xs">{record.operatorName || "—"}</TD>
                      <TD className="whitespace-nowrap text-[11px] text-muted-foreground tabular">
                        {formatDateTime(record.createdAt)}
                      </TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => void openAdjustForRecord(record)}
                        >
                          <Plus className="h-3 w-3" />
                          调整
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}

        {records.length > 0 ? (
          <div className="border-t border-border/60 px-4 py-3">
            <Pagination
              page={page}
              pages={query.data?.pages ?? 1}
              total={query.data?.total ?? 0}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>

      <Dialog
        open={adjustOpen}
        onOpenChange={(open) => {
          setAdjustOpen(open);
          if (!open) {
            setAdjust(emptyAdjust);
            setAdjustError("");
          }
        }}
        title="库存调整"
        description="选择一个已上架商品，填写大于 0 的整数数量。提交后会写入一条人工调整流水。"
        size="md"
        footer={
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              实际库存以服务端校验为准。
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdjustOpen(false)}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={submitAdjust}
                loading={adjustMutation.isPending}
                disabled={!adjust.product || adjust.loadingProduct}
              >
                确认调整
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="adjust-product-search">搜索商品</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="adjust-product-search"
                value={productKeyword}
                onChange={(event) => setProductKeyword(event.target.value)}
                placeholder="输入商品名称、花语或标签搜索"
                className="pl-8"
                autoComplete="off"
                data-autofocus
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              公开商品接口只返回已上架商品，因此这里无法选择已下架商品。
            </p>
            {productKeyword.trim() ? (
              <div className="h-44 overflow-y-auto rounded-lg border border-border/60">
                {productSearch.isLoading ? (
                  <div className="space-y-1.5 p-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : productSearch.isError ? (
                  <p className="p-3 text-xs text-destructive">
                    {getErrorMessage(productSearch.error)}
                  </p>
                ) : (productSearch.data?.records.length ?? 0) === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">没有找到已上架商品。</p>
                ) : (
                  productSearch.data?.records.map((product) => {
                    const selected = adjust.product?.id === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setAdjust((current) => ({ ...current, product }));
                          setAdjustError("");
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 border-b border-border/40 px-2.5 py-2 text-left last:border-b-0 hover:bg-muted/50",
                          selected && "bg-primary/[0.06]",
                        )}
                      >
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          seed={product.name}
                          className="h-9 w-9 shrink-0 rounded-md"
                          iconClassName="h-4 w-4"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">
                            {product.name}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            #{product.id} · {product.category} · 库存 {product.stock}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground tabular">
                          {formatCurrency(product.price)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <div className="h-20">
            {adjust.loadingProduct ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : adjust.product ? (
              <div className="flex h-full items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <ProductImage
                  src={adjust.product.imageUrl}
                  alt={adjust.product.name}
                  seed={adjust.product.name}
                  className="h-12 w-12 shrink-0 rounded-lg"
                  iconClassName="h-5 w-5"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{adjust.product.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    #{adjust.product.id} · {adjust.product.category} · 当前库存{" "}
                    <span className="font-medium text-foreground tabular">
                      {formatNumber(adjust.product.stock)}
                    </span>{" "}
                    件
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="取消选择商品"
                  onClick={() => setAdjust((current) => ({ ...current, product: null }))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="flex h-full items-center rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                尚未选择商品。请先在上方搜索并选择一个商品。
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>调整方向</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={adjust.mode === "increase"}
                  onClick={() => setAdjust((current) => ({ ...current, mode: "increase" }))}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                    adjust.mode === "increase"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                  入库 / 增加
                </button>
                <button
                  type="button"
                  aria-pressed={adjust.mode === "decrease"}
                  onClick={() => setAdjust((current) => ({ ...current, mode: "decrease" }))}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                    adjust.mode === "decrease"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  扣减 / 减少
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-quantity">数量 *</Label>
              <Input
                id="adjust-quantity"
                type="number"
                min={1}
                step={1}
                value={adjust.quantity}
                onChange={(event) =>
                  setAdjust((current) => ({ ...current, quantity: event.target.value }))
                }
                aria-invalid={Boolean(adjust.quantity) && !validQuantity}
              />
              <p className="text-[11px] text-muted-foreground">
                {adjust.product
                  ? wouldGoNegative
                    ? "数量超过当前库存，调整后库存不能小于 0。"
                    : `调整后库存：${formatNumber(previewStock)} 件`
                  : "填写大于 0 的整数。"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-remark">备注</Label>
            <textarea
              id="adjust-remark"
              value={adjust.remark}
              onChange={(event) =>
                setAdjust((current) => ({ ...current, remark: event.target.value }))
              }
              maxLength={200}
              rows={3}
              placeholder="例如：门店盘点补货、损耗扣除…"
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            <p className="text-right text-[10px] text-muted-foreground tabular">
              {adjust.remark.length}/200
            </p>
          </div>

          {adjustError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/[0.04] px-3 py-2 text-xs text-destructive">
              {adjustError}
            </p>
          ) : null}

          {adjust.product ? (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {adjust.mode === "increase" ? (
                  <Plus className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {adjust.mode === "increase" ? "增加" : "扣减"}{" "}
                {validQuantity ? formatNumber(quantity) : "—"} 件
              </span>
              <span className="tabular">
                {formatNumber(adjust.product.stock)} →{" "}
                {validQuantity && !wouldGoNegative ? formatNumber(previewStock) : "—"}
              </span>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
