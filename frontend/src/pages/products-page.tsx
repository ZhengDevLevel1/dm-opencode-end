import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, RotateCcw, Search, X } from "lucide-react";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import { cartService, favoriteService, productService } from "@/lib/services";
import { useDict, useFavoritesQuery } from "@/hooks/queries";
import { useLoginGuard } from "@/hooks/use-login-guard";
import { getErrorMessage } from "@/lib/api-client";
import { toast } from "@/stores/toast";
import type { ProductQuery, ProductSort, ProductVO, SeasonSuitability } from "@/types/api";
import { ProductCard } from "@/components/domain/product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "sales_desc", label: "销量优先" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
  { value: "newest", label: "最新上架" },
  { value: "rating_desc", label: "评分优先" },
];

const FILTER_SELECT_CLASS =
  "h-9 w-full cursor-pointer rounded-lg border-border bg-card font-medium shadow-xs transition-[border-color,background-color,box-shadow] hover:border-primary/40 hover:bg-accent/40";

const SEASON_VALUES: SeasonSuitability[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER", "ALL"];
const PAGE_SIZE_OPTIONS = [12, 24, 48];
const PAGE_SIZE_SELECT_OPTIONS = PAGE_SIZE_OPTIONS.map((option) => ({
  value: String(option),
  label: `${option} 条`,
}));

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { requireLogin } = useLoginGuard();
  const dict = useDict();
  const favorites = useFavoritesQuery();
  const [searchInput, setSearchInput] = useState(params.get("keyword") ?? "");
  const [favPendingId, setFavPendingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    setSearchInput(params.get("keyword") ?? "");
  }, [params]);

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const sortParam = params.get("sort") ?? "sales_desc";
  const sort: ProductSort = SORT_OPTIONS.some((option) => option.value === sortParam)
    ? (sortParam as ProductSort)
    : "sales_desc";
  const seasonParam = params.get("season") ?? "";
  const season = SEASON_VALUES.includes(seasonParam as SeasonSuitability)
    ? (seasonParam as SeasonSuitability)
    : undefined;
  const sizeParam = Number(params.get("size") ?? "12");
  const size = PAGE_SIZE_OPTIONS.includes(sizeParam) ? sizeParam : 12;

  const query = useMemo<ProductQuery>(() => {
    const result: ProductQuery = { page, size, sort };
    const keyword = params.get("keyword")?.trim();
    const category = params.get("category")?.trim();
    const occasion = params.get("occasion")?.trim();
    const festival = params.get("festival")?.trim();
    const minPrice = Number(params.get("minPrice"));
    const maxPrice = Number(params.get("maxPrice"));
    if (keyword) result.keyword = keyword;
    if (category) result.category = category;
    if (occasion) result.occasion = occasion;
    if (festival) result.festival = festival;
    if (season) result.season = season;
    if (Number.isFinite(minPrice) && params.get("minPrice")) result.minPrice = minPrice;
    if (Number.isFinite(maxPrice) && params.get("maxPrice")) result.maxPrice = maxPrice;
    return result;
  }, [params, page, size, sort, season]);

  const products = useQuery({
    queryKey: queryKeys.products(query),
    queryFn: () => productService.list(query),
    staleTime: queryPolicy.products.staleTime,
  });

  const favoriteIds = useMemo(
    () => new Set(favorites.data?.map((product) => product.id) ?? []),
    [favorites.data],
  );

  const addMutation = useMutation({
    mutationFn: (product: ProductVO) => cartService.add({ productId: product.id, quantity: 1 }),
    onSuccess: (_, product) => {
      toast.success("已加入购物车", `${product.name} 正在购物车里等你。`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
    onError: (error) => toast.error("加入购物车失败", getErrorMessage(error)),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ productId, favorite }: { productId: number; favorite: boolean }) =>
      favorite ? favoriteService.add(productId) : favoriteService.remove(productId),
    onSuccess: (_, variables) => {
      toast.success(variables.favorite ? "已收藏" : "已取消收藏");
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
    onError: (error) => toast.error("收藏操作失败", getErrorMessage(error)),
  });

  const updateParams = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    if (resetPage) next.delete("page");
    setParams(next);
  };

  const clearAll = () => {
    setParams(new URLSearchParams());
    setSearchInput("");
  };

  const submitSearch = () => {
    updateParams({ keyword: searchInput.trim() || undefined });
  };

  const applyPrice = (key: "minPrice" | "maxPrice") => {
    const input = document.getElementById(`price-${key}`) as HTMLInputElement | null;
    const raw = input?.value.trim() ?? "";
    if (raw && !Number.isFinite(Number(raw))) return;
    updateParams({ [key]: raw || undefined });
  };

  const handleAdd = async (product: ProductVO) => {
    if (!requireLogin()) return;
    setAddingId(product.id);
    try {
      await addMutation.mutateAsync(product);
    } finally {
      setAddingId(null);
    }
  };

  const handleFavorite = async (product: ProductVO) => {
    if (!requireLogin()) return;
    setFavPendingId(product.id);
    try {
      await favoriteMutation.mutateAsync({
        productId: product.id,
        favorite: !favoriteIds.has(product.id),
      });
    } finally {
      setFavPendingId(null);
    }
  };

  const seasonLabel = dict.data?.seasons.find((item) => item.value === season)?.label;

  const categoryOptions = useMemo(
    () => (dict.data?.categories ?? []).map((item) => ({ value: item, label: item })),
    [dict.data],
  );
  const occasionOptions = useMemo(
    () => (dict.data?.occasions ?? []).map((item) => ({ value: item, label: item })),
    [dict.data],
  );
  const festivalOptions = useMemo(
    () => (dict.data?.festivals ?? []).map((item) => ({ value: item, label: item })),
    [dict.data],
  );
  const seasonOptions = useMemo(
    () => (dict.data?.seasons ?? []).map((item) => ({ value: item.value, label: item.label })),
    [dict.data],
  );

  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  const keyword = params.get("keyword");
  const category = params.get("category");
  const occasion = params.get("occasion");
  const festival = params.get("festival");
  const minPrice = params.get("minPrice");
  const maxPrice = params.get("maxPrice");
  if (keyword) activeChips.push({ key: "keyword", label: `关键词：${keyword}`, onRemove: () => updateParams({ keyword: undefined }) });
  if (category) activeChips.push({ key: "category", label: `品类：${category}`, onRemove: () => updateParams({ category: undefined }) });
  if (occasion) activeChips.push({ key: "occasion", label: `场景：${occasion}`, onRemove: () => updateParams({ occasion: undefined }) });
  if (festival) activeChips.push({ key: "festival", label: `节日：${festival}`, onRemove: () => updateParams({ festival: undefined }) });
  if (season) activeChips.push({ key: "season", label: `季节：${seasonLabel}`, onRemove: () => updateParams({ season: undefined }) });
  if (minPrice) activeChips.push({ key: "minPrice", label: `最低 ¥${minPrice}`, onRemove: () => updateParams({ minPrice: undefined }) });
  if (maxPrice) activeChips.push({ key: "maxPrice", label: `最高 ¥${maxPrice}`, onRemove: () => updateParams({ maxPrice: undefined }) });
  if (sort !== "sales_desc") {
    activeChips.push({
      key: "sort",
      label: `排序：${SORT_OPTIONS.find((option) => option.value === sort)?.label}`,
      onRemove: () => updateParams({ sort: undefined }),
    });
  }

  return (
    <div className="space-y-5">
      <div className="ui-card space-y-4 p-5">
        {/* 第一行：主搜索区（移动端纵向堆叠，桌面端一行） */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              placeholder="搜索花名、花语、场景或节日"
              className="pl-10"
              aria-label="搜索花礼"
            />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button onClick={submitSearch} className="w-full px-6 sm:w-auto">
              搜索
            </Button>
            <Button
              variant="secondary"
              onClick={clearAll}
              className="shrink-0 px-4"
              title="重置全部筛选"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-px w-full bg-border/60" aria-hidden />

        {/* 第二行：筛选选项区，自动换行，排序靠右 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-28 shrink-0">
            <CustomSelect
              aria-label="品类"
              value={category ?? ""}
              onChange={(next) => updateParams({ category: next || undefined })}
              placeholder="全部品类"
              options={categoryOptions}
              className={FILTER_SELECT_CLASS}
            />
          </div>
          <div className="w-28 shrink-0">
            <CustomSelect
              aria-label="场景"
              value={occasion ?? ""}
              onChange={(next) => updateParams({ occasion: next || undefined })}
              placeholder="全部场景"
              options={occasionOptions}
              className={FILTER_SELECT_CLASS}
            />
          </div>
          <div className="w-28 shrink-0">
            <CustomSelect
              aria-label="节日"
              value={festival ?? ""}
              onChange={(next) => updateParams({ festival: next || undefined })}
              placeholder="全部节日"
              options={festivalOptions}
              className={FILTER_SELECT_CLASS}
            />
          </div>
          <div className="w-28 shrink-0">
            <CustomSelect
              aria-label="季节"
              value={season ?? ""}
              onChange={(next) => updateParams({ season: next || undefined })}
              placeholder="全部季节"
              options={seasonOptions}
              className={FILTER_SELECT_CLASS}
            />
          </div>

          {/* 价格区间 */}
          <div className="flex items-center gap-1.5">
            <Input
              id="price-minPrice"
              type="number"
              min={0}
              step="0.01"
              placeholder="最低价"
              defaultValue={minPrice ?? ""}
              className="h-9 w-24 rounded-lg px-3 text-center tabular-nums shadow-xs"
              aria-label="最低价格"
              onBlur={() => applyPrice("minPrice")}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyPrice("minPrice");
              }}
            />
            <span className="text-muted-foreground select-none" aria-hidden>
              -
            </span>
            <Input
              id="price-maxPrice"
              type="number"
              min={0}
              step="0.01"
              placeholder="最高价"
              defaultValue={maxPrice ?? ""}
              className="h-9 w-24 rounded-lg px-3 text-center tabular-nums shadow-xs"
              aria-label="最高价格"
              onBlur={() => applyPrice("maxPrice")}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyPrice("maxPrice");
              }}
            />
          </div>

          {/* 排序靠右 */}
          <div className="ml-auto w-36 shrink-0">
            <CustomSelect
              aria-label="排序"
              value={sort}
              onChange={(next) => updateParams({ sort: next })}
              options={SORT_OPTIONS}
              className={FILTER_SELECT_CLASS}
            />
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <Filter className="mr-0.5 h-3.5 w-3.5 text-muted-foreground" />
            {activeChips.map((chip) => (
              <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
                {chip.label}
                <button
                  type="button"
                  aria-label={`移除筛选 ${chip.label}`}
                  onClick={chip.onRemove}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="link" size="sm" className="h-7 text-xs" onClick={clearAll}>
              清除全部
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {products.data ? `共 ${products.data.total} 件花礼` : "正在整理花礼…"}
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="page-size" className="text-xs text-muted-foreground">
            每页
          </Label>
          <div className="w-24 shrink-0">
            <CustomSelect
              id="page-size"
              aria-label="每页条数"
              value={String(size)}
              onChange={(next) => updateParams({ size: next }, true)}
              options={PAGE_SIZE_SELECT_OPTIONS}
              className={FILTER_SELECT_CLASS}
            />
          </div>
        </div>
      </div>

      {products.isLoading ? (
        <ProductGridSkeleton count={size} />
      ) : products.isError ? (
        <ErrorState
          description={getErrorMessage(products.error)}
          onRetry={() => void products.refetch()}
        />
      ) : (products.data?.records.length ?? 0) === 0 ? (
        <EmptyState
          icon={Search}
          title="没有找到相关花礼"
          description="换个关键词或清除筛选试试，当季花礼还有很多。"
          action={
            <Button variant="outline" onClick={clearAll}>
              清除全部筛选
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.data?.records.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteIds.has(product.id)}
                favoritePending={favPendingId === product.id}
                addPending={addingId === product.id}
                onFavorite={handleFavorite}
                onAddToCart={handleAdd}
              />
            ))}
          </div>
          <Pagination
            page={products.data?.page ?? page}
            pages={products.data?.pages ?? 0}
            total={products.data?.total ?? 0}
            pageSize={size}
            onPageChange={(next) => updateParams({ page: String(next) }, false)}
            className="pt-2"
          />
        </>
      )}

    </div>
  );
}
