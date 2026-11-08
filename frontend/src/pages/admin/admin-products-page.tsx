import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useDict } from "@/hooks/queries";
import { toast } from "@/stores/toast";
import { cn } from "@/lib/cn";
import type {
  ProductQuery,
  ProductSaveRequest,
  ProductSort,
  ProductStatus,
  ProductVO,
  SeasonSuitability,
  StockLevel,
} from "@/types/api";
import { ImageUpload } from "@/components/domain/image-upload";
import { ProductImage } from "@/components/domain/product-image";
import { Rating } from "@/components/domain/rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TagPicker } from "@/components/ui/tag-picker";
import {
  FESTIVAL_TAG_OPTIONS,
  FLOWER_MEANING_OPTIONS,
  OCCASION_TAG_OPTIONS,
} from "@/lib/product-tags";

const PAGE_SIZE = 10;

const FILTER_SELECT_CLASS =
  "h-9 w-full cursor-pointer rounded-lg border-border bg-card font-medium shadow-xs transition-[border-color,background-color,box-shadow] hover:border-primary/40 hover:bg-accent/40";

const seasons: Array<{ value: SeasonSuitability; label: string }> = [
  { value: "SPRING", label: "春季" },
  { value: "SUMMER", label: "夏季" },
  { value: "AUTUMN", label: "秋季" },
  { value: "WINTER", label: "冬季" },
  { value: "ALL", label: "四季" },
];

const productStatusOptions: Array<{ value: ProductStatus; label: string }> = [
  { value: "ON_SALE", label: "上架" },
  { value: "OFF_SHELF", label: "下架" },
];

const productSortOptions: Array<{ value: ProductSort; label: string }> = [
  { value: "newest", label: "最新上架" },
  { value: "sales_desc", label: "销量优先" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
  { value: "rating_desc", label: "评分优先" },
  { value: "stock_asc", label: "库存从低到高" },
  { value: "stock_desc", label: "库存从高到低" },
];

const productSchema = z.object({
  name: z.string().trim().min(1, "请输入商品名称").max(100, "商品名称最多 100 个字符"),
  category: z.string().trim().min(1, "请选择品类").max(30, "品类最多 30 个字符"),
  flowerMeaning: z.string().trim().max(200, "花语最多 200 个字符").optional(),
  occasionTags: z.string().trim().max(200, "场景标签最多 200 个字符").optional(),
  festivalTags: z.string().trim().max(200, "节日标签最多 200 个字符").optional(),
  price: z
    .string()
    .trim()
    .min(1, "请输入价格")
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0.01, "价格不能低于 0.01"),
  originalPrice: z
    .string()
    .trim()
    .refine(
      (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0.01),
      "划线价不能低于 0.01",
    ),
  stock: z
    .string()
    .trim()
    .min(1, "请输入库存")
    .refine((value) => /^\d+$/.test(value), "库存必须是非负整数"),
  imageUrl: z.string().trim().max(500, "图片地址最多 500 个字符").optional(),
  description: z.string().trim().max(2000, "描述最多 2000 个字符").optional(),
  seasonSuitability: z.enum(["SPRING", "SUMMER", "AUTUMN", "WINTER", "ALL"]),
  status: z.enum(["ON_SALE", "OFF_SHELF"]),
});

type ProductFormValues = z.infer<typeof productSchema>;

function toFormValues(product: ProductVO | null): ProductFormValues {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "",
    flowerMeaning: product?.flowerMeaning ?? "",
    occasionTags: product?.occasionTags ?? "",
    festivalTags: product?.festivalTags ?? "",
    price: product ? String(product.price) : "",
    originalPrice: product?.originalPrice ? String(product.originalPrice) : "",
    stock: product ? String(product.stock) : "0",
    imageUrl: product?.imageUrl ?? "",
    description: product?.description ?? "",
    seasonSuitability: product?.seasonSuitability ?? "ALL",
    status: product?.status ?? "ON_SALE",
  };
}

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const dict = useDict();
  const [searchParams] = useSearchParams();
  const urlKeyword = searchParams.get("keyword") ?? "";
  const [draftKeyword, setDraftKeyword] = useState(urlKeyword);
  const [keyword, setKeyword] = useState(urlKeyword);
  const [status, setStatus] = useState("");
  const [stockLevel, setStockLevel] = useState<StockLevel>("ALL");
  const [category, setCategory] = useState("");
  const [occasion, setOccasion] = useState("");
  const [festival, setFestival] = useState("");
  const [season, setSeason] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<ProductSort>("newest");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ open: boolean; product: ProductVO | null }>({
    open: false,
    product: null,
  });
  const [deleting, setDeleting] = useState<ProductVO | null>(null);

  const categoryFilterOptions = useMemo(
    () => (dict.data?.categories ?? []).map((item) => ({ value: item, label: item })),
    [dict.data?.categories],
  );
  const occasionFilterOptions = useMemo(
    () => (dict.data?.occasions ?? OCCASION_TAG_OPTIONS).map((item) => ({ value: item, label: item })),
    [dict.data?.occasions],
  );
  const festivalFilterOptions = useMemo(
    () => (dict.data?.festivals ?? FESTIVAL_TAG_OPTIONS).map((item) => ({ value: item, label: item })),
    [dict.data?.festivals],
  );
  const stockLow = dict.data?.metrics?.stockLowThreshold ?? 10;
  const stockHigh = dict.data?.metrics?.stockHighThreshold ?? 50;

  useEffect(() => {
    if (!urlKeyword) return;
    setDraftKeyword(urlKeyword);
    setKeyword(urlKeyword);
    setPage(1);
  }, [urlKeyword]);

  const params = useMemo<ProductQuery>(
    () => ({
      page,
      size: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      status: status ? (status as ProductStatus) : undefined,
      stockLevel: stockLevel === "ALL" ? undefined : stockLevel,
      category: category || undefined,
      occasion: occasion || undefined,
      festival: festival || undefined,
      season: season ? (season as SeasonSuitability) : undefined,
      minPrice: minPrice.trim() && Number.isFinite(Number(minPrice)) ? Number(minPrice) : undefined,
      maxPrice: maxPrice.trim() && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : undefined,
      sort,
    }),
    [
      page,
      keyword,
      status,
      stockLevel,
      category,
      occasion,
      festival,
      season,
      minPrice,
      maxPrice,
      sort,
    ],
  );

  const query = useQuery({
    queryKey: queryKeys.adminProducts(params),
    queryFn: () => adminService.products(params),
    placeholderData: (previous) => previous,
  });

  const statusMutation = useMutation({
    mutationFn: ({ product, next }: { product: ProductVO; next: ProductStatus }) =>
      adminService.setProductStatus(product.id, next),
    onSuccess: (product) => {
      toast.success(product.status === "ON_SALE" ? "商品已上架" : "商品已下架", product.name);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product", product.id] });
    },
    onError: (error) => toast.error("状态更新失败", getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (product: ProductVO) => adminService.deleteProduct(product.id),
    onSuccess: () => {
      toast.success("商品已删除", "删除后公开接口不再展示该商品。");
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error("删除失败", getErrorMessage(error)),
  });

  const activeFilters = [
    keyword,
    status,
    stockLevel !== "ALL",
    category,
    occasion,
    festival,
    season,
    minPrice,
    maxPrice,
    sort !== "newest",
  ].filter(Boolean).length;
  const records = query.data?.records ?? [];

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setKeyword(draftKeyword);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftKeyword("");
    setKeyword("");
    setStatus("");
    setStockLevel("ALL");
    setCategory("");
    setOccasion("");
    setFestival("");
    setSeason("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">商品管理</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            维护花礼信息、上下架状态与库存。编辑库存会由后端自动生成库存变动记录。
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditor({ open: true, product: null })}
        >
          <Plus className="h-3.5 w-3.5" />
          新建商品
        </Button>
      </div>

      <div className="ui-card space-y-4 p-5">
        <form onSubmit={applyFilters}>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:flex-1">
              <Label htmlFor="admin-product-keyword" className="sr-only">
                搜索商品
              </Label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="admin-product-keyword"
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                placeholder="搜索名称、花语、场景或节日标签"
                className="pl-10"
                aria-label="搜索商品"
              />
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button type="submit" className="w-full px-6 sm:w-auto">
                搜索
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={clearFilters}
                className="shrink-0 px-4"
                title="重置全部筛选"
              >
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
            </div>
          </div>

          <div className="my-4 h-px w-full bg-border/60" aria-hidden />

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-28 shrink-0">
              <Label htmlFor="admin-product-status" className="sr-only">
                状态
              </Label>
              <CustomSelect
                id="admin-product-status"
                value={status}
                onChange={(next) => {
                  setStatus(next);
                  setPage(1);
                }}
                options={productStatusOptions}
                placeholder="全部状态"
                className={FILTER_SELECT_CLASS}
              />
            </div>
            <div className="w-44 shrink-0">
              <Label htmlFor="admin-product-stock" className="sr-only">
                库存
              </Label>
              <CustomSelect
                id="admin-product-stock"
                value={stockLevel}
                onChange={(next) => {
                  setStockLevel(next as StockLevel);
                  setPage(1);
                }}
                options={[
                  { value: "ALL", label: "全部库存" },
                  { value: "OVERSTOCK", label: `过量库存 (≥ ${stockHigh})` },
                  {
                    value: "SUFFICIENT",
                    label: `充足库存 (${stockLow}–${Math.max(stockLow, stockHigh - 1)})`,
                  },
                  { value: "LOW", label: `低库存 (< ${stockLow})` },
                ]}
                placeholder="全部库存"
                className={FILTER_SELECT_CLASS}
              />
            </div>
            <div className="w-28 shrink-0">
              <Label htmlFor="admin-product-category" className="sr-only">
                品类
              </Label>
              <CustomSelect
                id="admin-product-category"
                value={category}
                onChange={(next) => {
                  setCategory(next);
                  setPage(1);
                }}
                options={categoryFilterOptions}
                placeholder="全部品类"
                className={FILTER_SELECT_CLASS}
              />
            </div>
            <div className="w-28 shrink-0">
              <Label htmlFor="admin-product-occasion" className="sr-only">
                场景
              </Label>
              <CustomSelect
                id="admin-product-occasion"
                value={occasion}
                onChange={(next) => {
                  setOccasion(next);
                  setPage(1);
                }}
                options={occasionFilterOptions}
                placeholder="全部场景"
                className={FILTER_SELECT_CLASS}
              />
            </div>
            <div className="w-28 shrink-0">
              <Label htmlFor="admin-product-festival" className="sr-only">
                节日
              </Label>
              <CustomSelect
                id="admin-product-festival"
                value={festival}
                onChange={(next) => {
                  setFestival(next);
                  setPage(1);
                }}
                options={festivalFilterOptions}
                placeholder="全部节日"
                className={FILTER_SELECT_CLASS}
              />
            </div>
            <div className="w-28 shrink-0">
              <Label htmlFor="admin-product-season" className="sr-only">
                季节
              </Label>
              <CustomSelect
                id="admin-product-season"
                value={season}
                onChange={(next) => {
                  setSeason(next);
                  setPage(1);
                }}
                options={seasons}
                placeholder="全部季节"
                className={FILTER_SELECT_CLASS}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Input
                id="admin-product-min-price"
                type="number"
                min={0}
                step={0.01}
                value={minPrice}
                onChange={(event) => {
                  setMinPrice(event.target.value);
                  setPage(1);
                }}
                placeholder="最低价"
                className="h-9 w-24 rounded-lg px-3 text-center tabular-nums shadow-xs"
                aria-label="最低价格"
              />
              <span className="text-muted-foreground select-none" aria-hidden>
                -
              </span>
              <Input
                id="admin-product-max-price"
                type="number"
                min={0}
                step={0.01}
                value={maxPrice}
                onChange={(event) => {
                  setMaxPrice(event.target.value);
                  setPage(1);
                }}
                placeholder="最高价"
                className="h-9 w-24 rounded-lg px-3 text-center tabular-nums shadow-xs"
                aria-label="最高价格"
              />
            </div>

            <div className="ml-auto w-36 shrink-0">
              <Label htmlFor="admin-product-sort" className="sr-only">
                排序
              </Label>
              <CustomSelect
                id="admin-product-sort"
                value={sort}
                onChange={(next) => {
                  setSort(next as ProductSort);
                  setPage(1);
                }}
                options={productSortOptions}
                className={FILTER_SELECT_CLASS}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PackagePlus className="h-3.5 w-3.5" />
            共 {formatNumber(query.data?.total)} 件商品
          </div>
          <p className="text-[11px] text-muted-foreground">
            不选择状态时同时包含已上架与已下架商品
          </p>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="商品列表没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title={activeFilters > 0 ? "没有符合筛选条件的商品" : "还没有商品"}
            description={
              activeFilters > 0
                ? "试试清除筛选条件，或换一个关键词。"
                : "创建第一件花礼后，它会出现在这里。"
            }
            bare
            action={
              activeFilters > 0 ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  清除筛选
                </Button>
              ) : (
                <Button size="sm" onClick={() => setEditor({ open: true, product: null })}>
                  <Plus className="h-3.5 w-3.5" />
                  新建商品
                </Button>
              )
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>商品</TH>
                  <TH>价格</TH>
                  <TH>库存</TH>
                  <TH>销量 / 评分</TH>
                  <TH>状态</TH>
                  <TH>更新时间</TH>
                  <TH className="text-right">操作</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((product) => (
                  <TR key={product.id}>
                    <TD className="min-w-56 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          seed={product.name}
                          className="h-10 w-10 shrink-0 rounded-lg"
                          iconClassName="h-4 w-4"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{product.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            #{product.id} · {product.category} · {product.seasonLabel}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <p className="text-xs font-medium tabular">
                        {formatCurrency(product.price)}
                      </p>
                      {product.originalPrice ? (
                        <p className="text-[10px] text-muted-foreground line-through tabular">
                          {formatCurrency(product.originalPrice)}
                        </p>
                      ) : null}
                    </TD>
                    <TD>
                      <span
                        className={cn(
                          "text-xs font-medium tabular",
                          product.stock < stockLow && "text-destructive",
                        )}
                      >
                        {formatNumber(product.stock)}
                      </span>
                      {product.stock < stockLow ? (
                        <span className="ml-1.5 text-[10px] text-destructive">低库存</span>
                      ) : null}
                    </TD>
                    <TD>
                      <p className="text-xs tabular">销量 {formatNumber(product.salesCount)}</p>
                      <Rating
                        value={product.ratingAvg}
                        count={product.ratingCount}
                        compact
                        className="mt-0.5"
                      />
                    </TD>
                    <TD>
                      <Badge variant={product.status === "ON_SALE" ? "success" : "secondary"}>
                        {product.statusLabel}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-[11px] text-muted-foreground tabular">
                      {formatDateTime(product.updatedAt ?? product.createdAt)}
                    </TD>
                    <TD className="text-right">
                      <DropdownMenu
                        triggerLabel={`${product.name} 操作`}
                        trigger={
                          <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        }
                      >
                        <DropdownItem
                          onClick={() => setEditor({ open: true, product })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          编辑商品
                        </DropdownItem>
                        <DropdownItem
                          disabled={statusMutation.isPending}
                          onClick={() => {
                            if (product.status !== "ON_SALE" && product.stock <= 0) {
                              toast.info("库存为0，请先补充库存再上架", product.name);
                              return;
                            }
                            statusMutation.mutate({
                              product,
                              next: product.status === "ON_SALE" ? "OFF_SHELF" : "ON_SALE",
                            });
                          }}
                        >
                          {product.status === "ON_SALE" ? (
                            <>
                              <Archive className="h-3.5 w-3.5" />
                              下架商品
                            </>
                          ) : (
                            <>
                              <ArchiveRestore className="h-3.5 w-3.5" />
                              重新上架
                            </>
                          )}
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem destructive onClick={() => setDeleting(product)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          删除商品
                        </DropdownItem>
                      </DropdownMenu>
                    </TD>
                  </TR>
                ))}
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

      <ProductEditorDialog
        open={editor.open}
        product={editor.product}
        categories={dict.data?.categories ?? []}
        onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`删除「${deleting?.name ?? ""}」？`}
        description="这是逻辑删除：删除后公开接口不再展示该商品，但历史订单与评价仍然保留。"
        confirmText="删除商品"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting);
        }}
      />
    </div>
  );
}

function ProductEditorDialog({
  open,
  product,
  categories,
  onOpenChange,
}: {
  open: boolean;
  product: ProductVO | null;
  categories: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const dict = useDict();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: toFormValues(product),
  });
  const imageUrl = watch("imageUrl");

  useEffect(() => {
    if (open) reset(toFormValues(product));
  }, [open, product, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const body: ProductSaveRequest = {
        name: values.name.trim(),
        category: values.category.trim(),
        flowerMeaning: values.flowerMeaning?.trim() || undefined,
        occasionTags: values.occasionTags?.trim() || undefined,
        festivalTags: values.festivalTags?.trim() || undefined,
        price: Number(values.price),
        originalPrice: values.originalPrice.trim()
          ? Number(values.originalPrice)
          : undefined,
        stock: Number(values.stock),
        imageUrl: values.imageUrl?.trim() || undefined,
        description: values.description?.trim() || undefined,
        seasonSuitability: values.seasonSuitability,
        status: values.status,
      };
      return product
        ? adminService.updateProduct(product.id, body)
        : adminService.createProduct(body);
    },
    onSuccess: (saved) => {
      toast.success(product ? "商品已更新" : "商品已创建", saved.name);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "product", saved.id] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product", saved.id] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "inventory"] });
      onOpenChange(false);
    },
    onError: (error) => toast.error(product ? "商品更新失败" : "商品创建失败", getErrorMessage(error)),
  });

  const categoryOptions = Array.from(
    new Set([...categories, ...(dict.data?.categories ?? []), product?.category ?? ""]),
  )
    .filter(Boolean)
    .map((item) => ({ value: item, label: item }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={product ? "编辑商品" : "新建商品"}
      description={
        product
          ? "修改库存后，后端会按新旧库存差异自动生成库存变动记录。"
          : "创建商品时初始销量与评分为 0；初始库存大于 0 会生成入库记录。"
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">带 * 的字段为必填项。</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              type="submit"
              form="admin-product-form"
              size="sm"
              loading={mutation.isPending}
            >
              {product ? "保存修改" : "创建商品"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        id="admin-product-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="product-name">商品名称 *</Label>
            <Input
              id="product-name"
              placeholder="例如：暮色玫瑰礼盒"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-category">品类 *</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <CustomSelect
                  id="product-category"
                  value={field.value}
                  onChange={field.onChange}
                  options={categoryOptions}
                  placeholder="请选择品类"
                  aria-invalid={Boolean(errors.category)}
                />
              )}
            />
            <FieldError message={errors.category?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-season">适用季节 *</Label>
            <Controller
              control={control}
              name="seasonSuitability"
              render={({ field }) => (
                <CustomSelect
                  id="product-season"
                  value={field.value}
                  onChange={field.onChange}
                  options={seasons}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-price">售价（元）*</Label>
            <Input
              id="product-price"
              type="number"
              min={0.01}
              step={0.01}
              inputMode="decimal"
              aria-invalid={Boolean(errors.price)}
              {...register("price")}
            />
            <FieldError message={errors.price?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-original-price">划线价（元）</Label>
            <Input
              id="product-original-price"
              type="number"
              min={0.01}
              step={0.01}
              inputMode="decimal"
              placeholder="可选"
              aria-invalid={Boolean(errors.originalPrice)}
              {...register("originalPrice")}
            />
            <FieldError message={errors.originalPrice?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-stock">库存 *</Label>
            <Input
              id="product-stock"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              aria-invalid={Boolean(errors.stock)}
              {...register("stock")}
            />
            <FieldError message={errors.stock?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-status">状态 *</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <CustomSelect
                  id="product-status"
                  value={field.value}
                  onChange={field.onChange}
                  options={productStatusOptions}
                />
              )}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              库存为 0 时保存会自动下架，补充库存后可重新上架。
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="product-meaning">花语</Label>
          <Controller
            control={control}
            name="flowerMeaning"
            render={({ field }) => (
              <TagPicker
                id="product-meaning"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={dict.data?.flowerMeanings ?? FLOWER_MEANING_OPTIONS}
                joinWith="，"
                maxSelected={dict.data?.tagMaxCounts?.flowerMeanings}
                placeholder="点击选择花语短语"
                invalid={Boolean(errors.flowerMeaning)}
                describedBy="product-meaning-hint"
              />
            )}
          />
          <p id="product-meaning-hint" className="text-[11px] text-muted-foreground">
            可多选，最多 {dict.data?.tagMaxCounts?.flowerMeanings ?? 6} 个；保存时按「，」拼接，推荐算法会拆分后参与内容相似度。
          </p>
          <FieldError message={errors.flowerMeaning?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="product-occasions">场景标签</Label>
            <Controller
              control={control}
              name="occasionTags"
              render={({ field }) => (
                <TagPicker
                  id="product-occasions"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={dict.data?.occasions ?? OCCASION_TAG_OPTIONS}
                  maxSelected={dict.data?.tagMaxCounts?.occasions}
                  placeholder="点击选择场景"
                  invalid={Boolean(errors.occasionTags)}
                  describedBy="product-occasions-hint"
                />
              )}
            />
            <p id="product-occasions-hint" className="text-[11px] text-muted-foreground">
              用于推荐算法的场景匹配，最多选 {dict.data?.tagMaxCounts?.occasions ?? 8} 个。
            </p>
            <FieldError message={errors.occasionTags?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-festivals">节日标签</Label>
            <Controller
              control={control}
              name="festivalTags"
              render={({ field }) => (
                <TagPicker
                  id="product-festivals"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={dict.data?.festivals ?? FESTIVAL_TAG_OPTIONS}
                  maxSelected={dict.data?.tagMaxCounts?.festivals}
                  placeholder="点击选择节日"
                  invalid={Boolean(errors.festivalTags)}
                  describedBy="product-festivals-hint"
                />
              )}
            />
            <p id="product-festivals-hint" className="text-[11px] text-muted-foreground">
              用于推荐算法的节日匹配，最多选 {dict.data?.tagMaxCounts?.festivals ?? 6} 个。
            </p>
            <FieldError message={errors.festivalTags?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>商品图片</Label>
          <ImageUpload
            value={imageUrl}
            onChange={(url) =>
              setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true })
            }
            category="product"
            cropAspect={4 / 5}
            className="aspect-[4/5] w-40"
            actionLabel="上传商品图片"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="product-description">商品描述</Label>
          <textarea
            id="product-description"
            rows={4}
            maxLength={2000}
            placeholder="花材、包装与配送说明…"
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            {...register("description")}
          />
          <FieldError message={errors.description?.message} />
        </div>
      </form>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
