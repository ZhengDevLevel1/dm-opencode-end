import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "sales_desc", label: "销量优先" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
  { value: "newest", label: "最新上架" },
  { value: "rating_desc", label: "评分优先" },
];

const SEASON_VALUES: SeasonSuitability[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER", "ALL"];
const PAGE_SIZE_OPTIONS = [12, 24, 48];

interface FilterDraft {
  keyword: string;
  category: string;
  occasion: string;
  festival: string;
  season: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  size: string;
}

function readDraft(params: URLSearchParams): FilterDraft {
  return {
    keyword: params.get("keyword") ?? "",
    category: params.get("category") ?? "",
    occasion: params.get("occasion") ?? "",
    festival: params.get("festival") ?? "",
    season: params.get("season") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    sort: params.get("sort") ?? "sales_desc",
    size: params.get("size") ?? "12",
  };
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { requireLogin } = useLoginGuard();
  const dict = useDict();
  const favorites = useFavoritesQuery();
  const [searchInput, setSearchInput] = useState(params.get("keyword") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(() => readDraft(params));
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

  const applyDraft = () => {
    const next = new URLSearchParams();
    (Object.entries(draft) as Array<[keyof FilterDraft, string]>).forEach(([key, value]) => {
      if (!value) return;
      if (key === "sort" && value === "sales_desc") return;
      if (key === "size" && value === "12") return;
      next.set(key, value);
    });
    setParams(next);
    setFilterOpen(false);
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
      <div className="ui-card p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch();
                }}
                placeholder="搜索花名、花语、场景或节日"
                className="pl-9"
                aria-label="搜索花礼"
              />
            </div>
            <Button onClick={submitSearch} className="shrink-0">
              搜索
            </Button>
            <Button
              variant="outline"
              className="shrink-0 lg:hidden"
              onClick={() => {
                setDraft(readDraft(params));
                setFilterOpen(true);
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              筛选
            </Button>
          </div>

          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <Select
              aria-label="品类"
              value={category ?? ""}
              onChange={(event) => updateParams({ category: event.target.value || undefined })}
              placeholder="全部品类"
              className="w-32"
            >
              {dict.data?.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select
              aria-label="场景"
              value={occasion ?? ""}
              onChange={(event) => updateParams({ occasion: event.target.value || undefined })}
              placeholder="全部场景"
              className="w-32"
            >
              {dict.data?.occasions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select
              aria-label="节日"
              value={festival ?? ""}
              onChange={(event) => updateParams({ festival: event.target.value || undefined })}
              placeholder="全部节日"
              className="w-32"
            >
              {dict.data?.festivals.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select
              aria-label="季节"
              value={season ?? ""}
              onChange={(event) => updateParams({ season: event.target.value || undefined })}
              placeholder="全部季节"
              className="w-32"
            >
              {dict.data?.seasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-1">
              <Input
                id="price-minPrice"
                type="number"
                min={0}
                step="0.01"
                placeholder="最低价"
                defaultValue={minPrice ?? ""}
                className="h-10 w-24"
                aria-label="最低价格"
                onBlur={() => applyPrice("minPrice")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyPrice("minPrice");
                }}
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                id="price-maxPrice"
                type="number"
                min={0}
                step="0.01"
                placeholder="最高价"
                defaultValue={maxPrice ?? ""}
                className="h-10 w-24"
                aria-label="最高价格"
                onBlur={() => applyPrice("maxPrice")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyPrice("maxPrice");
                }}
              />
            </div>
            <Select
              aria-label="排序"
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
              className="w-36"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </Button>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
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
          <Select
            id="page-size"
            value={String(size)}
            onChange={(event) => updateParams({ size: event.target.value }, true)}
            className="h-9 w-20"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} 条
              </option>
            ))}
          </Select>
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

      <Sheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="筛选花礼"
        description="按品类、场景、节日、季节与价格缩小范围"
        side="bottom"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDraft(readDraft(new URLSearchParams()))}
            >
              重置
            </Button>
            <Button onClick={applyDraft}>应用筛选</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="draft-keyword">关键词</Label>
            <Input
              id="draft-keyword"
              value={draft.keyword}
              onChange={(event) => setDraft({ ...draft, keyword: event.target.value })}
              placeholder="花名、花语、场景或节日"
            />
          </div>
          <div className="space-y-1.5">
            <Label>品类</Label>
            <Select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              placeholder="全部品类"
            >
              {dict.data?.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>场景</Label>
            <Select
              value={draft.occasion}
              onChange={(event) => setDraft({ ...draft, occasion: event.target.value })}
              placeholder="全部场景"
            >
              {dict.data?.occasions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>节日</Label>
            <Select
              value={draft.festival}
              onChange={(event) => setDraft({ ...draft, festival: event.target.value })}
              placeholder="全部节日"
            >
              {dict.data?.festivals.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>季节</Label>
            <Select
              value={draft.season}
              onChange={(event) => setDraft({ ...draft, season: event.target.value })}
              placeholder="全部季节"
            >
              {dict.data?.seasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>价格区间</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={draft.minPrice}
                onChange={(event) => setDraft({ ...draft, minPrice: event.target.value })}
                placeholder="最低"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="number"
                min={0}
                value={draft.maxPrice}
                onChange={(event) => setDraft({ ...draft, maxPrice: event.target.value })}
                placeholder="最高"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>排序</Label>
            <Select
              value={draft.sort}
              onChange={(event) => setDraft({ ...draft, sort: event.target.value })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
