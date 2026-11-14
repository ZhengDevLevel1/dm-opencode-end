import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Flower2,
  Gift,
  Leaf,
  PackageCheck,
  Sparkles,
  Sprout,
} from "lucide-react";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import {
  cartService,
  favoriteService,
  productService,
  recommendationService,
} from "@/lib/services";
import { useDict, useFavoritesQuery } from "@/hooks/queries";
import { useLoginGuard } from "@/hooks/use-login-guard";
import { getErrorMessage } from "@/lib/api-client";
import { OCCASION_TAG_OPTIONS } from "@/lib/product-tags";
import { toast } from "@/stores/toast";
import { ProductCard } from "@/components/domain/product-card";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import { SectionHeading } from "@/components/domain/section-heading";
import { ProductImage } from "@/components/domain/product-image";
import { Price } from "@/components/domain/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductVO } from "@/types/api";

const categoryColors = [
  "var(--flower-rose)",
  "var(--flower-amber)",
  "var(--primary)",
  "var(--flower-leaf)",
  "var(--flower-lilac)",
];

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoggedIn, requireLogin } = useLoginGuard();
  const dict = useDict();
  const favorites = useFavoritesQuery();
  const [favPendingId, setFavPendingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  const hot = useQuery({
    queryKey: queryKeys.hotProducts,
    queryFn: productService.hot,
    staleTime: 5 * 60 * 1000,
  });

  const newest = useQuery({
    queryKey: queryKeys.products({ page: 1, size: 8, sort: "newest" }),
    queryFn: () => productService.list({ page: 1, size: 8, sort: "newest" }),
    staleTime: queryPolicy.products.staleTime,
  });

  const recommendations = useQuery({
    queryKey: queryKeys.recommendations({ limit: 8, scene: "home" }),
    queryFn: () => recommendationService.get({ limit: 8, scene: "home" }),
    staleTime: queryPolicy.recommendations.staleTime,
  });

  const favoriteIds = useMemo(
    () => new Set(favorites.data?.map((product) => product.id) ?? []),
    [favorites.data],
  );

  const addMutation = useMutation({
    mutationFn: (product: ProductVO) =>
      cartService.add({ productId: product.id, quantity: 1 }),
    onSuccess: (_, product) => {
      toast.success("已加入购物车", `${product.name} 正在购物车里等你。`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
    onError: (error) => toast.error("加入购物车失败", getErrorMessage(error)),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ productId, favorite }: { productId: number; favorite: boolean }) =>
      favorite
        ? favoriteService.add(productId)
        : favoriteService.remove(productId),
    onSuccess: (_, variables) => {
      toast.success(variables.favorite ? "已收藏" : "已取消收藏");
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
    onError: (error) => toast.error("收藏操作失败", getErrorMessage(error)),
  });

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
    const favorite = !favoriteIds.has(product.id);
    setFavPendingId(product.id);
    try {
      await favoriteMutation.mutateAsync({ productId: product.id, favorite });
    } finally {
      setFavPendingId(null);
    }
  };

  const handleRecommendationFavorite = async (item: { productId: number; name: string }) => {
    if (!requireLogin()) return;
    const favorite = !favoriteIds.has(item.productId);
    setFavPendingId(item.productId);
    try {
      await favoriteMutation.mutateAsync({ productId: item.productId, favorite });
    } finally {
      setFavPendingId(null);
    }
  };

  const handleRecommendationAdd = async (item: { productId: number; name: string }) => {
    if (!requireLogin()) return;
    setAddingId(item.productId);
    try {
      await cartService.add({ productId: item.productId, quantity: 1 });
      toast.success("已加入购物车", `${item.name} 正在购物车里等你。`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    } catch (error) {
      toast.error("加入购物车失败", getErrorMessage(error));
    } finally {
      setAddingId(null);
    }
  };

  const heroRec = recommendations.data?.items[0];
  const categories = dict.data?.homeCategories ?? dict.data?.categories ?? [];
  const occasions =
    dict.data?.homeOccasions ?? (dict.data?.occasions ?? OCCASION_TAG_OPTIONS).slice(0, 6);
  const recData = recommendations.data;
  const coldStart = recData?.coldStart ?? !isLoggedIn;

  return (
    <div className="space-y-10 md:space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-5 py-6 shadow-[var(--shadow-card)] md:px-8 md:py-8">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(52rem 24rem at 105% -20%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 62%), radial-gradient(36rem 20rem at -5% 120%, color-mix(in oklab, var(--flower-rose) 10%, transparent), transparent 62%)",
          }}
          aria-hidden
        />
        <div className="relative z-[1] grid gap-7 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.14em] text-primary uppercase">
              <Sprout className="h-3 w-3" />
              {recData?.seasonLabel ?? "当季"} · {recData?.festival ?? "花礼推荐"}
            </p>
            <h1 className="mt-4 max-w-xl text-[26px] leading-tight font-semibold tracking-tight text-balance md:text-[32px]">
              把今天的花，送给在意的人。
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              当季花材、手工包装，按场景与节日挑选。下单后可以看见花艺师接单、备花与配送的每一步。
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button onClick={() => navigate("/products")}>
                挑选花礼
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/recommendations")}>
                <Sparkles className="h-4 w-4" />
                看智能推荐
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {occasions.map((occasion) => (
                <Link
                  key={occasion}
                  to={`/products?occasion=${encodeURIComponent(occasion)}`}
                  className="rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {occasion}
                </Link>
              ))}
            </div>
          </div>

          <div className="ui-card overflow-hidden">
            {recommendations.isLoading ? (
              <div className="p-3">
                <Skeleton className="aspect-[16/9] w-full" />
                <Skeleton className="mt-3 h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ) : heroRec ? (
              <Link to={`/products/${heroRec.productId}`} className="group block">
                <ProductImage
                  src={heroRec.imageUrl}
                  alt={heroRec.name}
                  seed={heroRec.name}
                  className="aspect-[16/9] w-full"
                  overlay={
                    <Badge variant="overlay" className="absolute top-3 left-3 text-[10px]">
                      当季花礼
                    </Badge>
                  }
                />
                <div className="p-4">
                  <p className="text-sm font-semibold tracking-tight group-hover:text-primary">
                    {heroRec.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{heroRec.reason}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Price amount={heroRec.price} originalAmount={heroRec.originalPrice} size="sm" />
                    <span className="text-[11px] text-primary">查看详情 →</span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="image-fallback flex aspect-[16/9] flex-col items-center justify-center gap-2 p-4 text-center">
                <Flower2 className="h-9 w-9 text-foreground/25" />
                <p className="text-xs text-muted-foreground">当季花礼正在准备中</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Browse by category"
          title="按品类挑花"
          description="从玫瑰到绿植，每一种都有适合的场景。"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate("/products")}>
              全部花礼 <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
        />
        {dict.isLoading ? (
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-[74px] w-full" />
            ))}
          </div>
        ) : dict.isError ? (
          <ErrorState
            className="mt-4"
            compact
            description="品类选项没有加载成功。"
            onRetry={() => void dict.refetch()}
          />
        ) : categories.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
            首页暂未配置品类展示，可在「标签管理 → 品类标签」中开启。
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
            {categories.map((category, index) => (
              <button
                key={category}
                type="button"
                onClick={() => navigate(`/products?category=${encodeURIComponent(category)}`)}
                className="ui-card group flex cursor-pointer flex-col items-center gap-2 px-2 py-3 transition-[border-color,background-color] hover:border-primary/40 hover:bg-accent/30"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background: `color-mix(in oklab, ${categoryColors[index % categoryColors.length]} 12%, transparent)`,
                    color: categoryColors[index % categoryColors.length],
                  }}
                >
                  <Flower2 className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="text-[11px] font-medium">{category}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow={coldStart ? "Cold start picks" : "For you"}
          title="为今天挑的推荐"
          description={
            coldStart
              ? "正在按当季与热度推荐，登录后会更懂你。"
              : "结合你的收藏、评价与近期订单，按内容与热度综合排序。"
          }
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate("/recommendations")}>
              查看全部 <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
        />
        {recommendations.isLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : recommendations.isError ? (
          <ErrorState
            className="mt-4"
            compact
            description="推荐结果没有送达，稍后再试。"
            onRetry={() => void recommendations.refetch()}
          />
        ) : (recommendations.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Sparkles}
            title="当季花礼正在准备中"
            description="稍后再来看看，或先浏览全部花礼。"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/products")}>
                浏览全部花礼
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recommendations.data?.items.slice(0, 4).map((item) => (
              <RecommendationCard
                key={item.productId}
                item={item}
                isFavorite={favoriteIds.has(item.productId)}
                favoritePending={favPendingId === item.productId}
                addPending={addingId === item.productId}
                onFavorite={handleRecommendationFavorite}
                onAddToCart={handleRecommendationAdd}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="Best sellers"
          title="热销花礼"
          description="被更多人选择的花，也许正适合今天。"
        />
        {hot.isLoading ? (
          <div className="mt-4">
            <ProductGridSkeleton count={4} />
          </div>
        ) : hot.isError ? (
          <ErrorState
            className="mt-4"
            compact
            description="热销花礼没有加载成功。"
            onRetry={() => void hot.refetch()}
          />
        ) : (hot.data?.length ?? 0) === 0 ? (
          <EmptyState className="mt-4" title="热销花礼正在补货" />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {hot.data?.slice(0, 4).map((product) => (
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
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="New arrivals"
          title="新品上架"
          description="新到的花材与刚刚完成的花束。"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/products?sort=newest")}
            >
              查看新品 <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
        />
        {newest.isLoading ? (
          <div className="mt-4">
            <ProductGridSkeleton count={4} />
          </div>
        ) : newest.isError ? (
          <ErrorState
            className="mt-4"
            compact
            description="新品列表没有加载成功。"
            onRetry={() => void newest.refetch()}
          />
        ) : (newest.data?.records.length ?? 0) === 0 ? (
          <EmptyState className="mt-4" title="新品正在整理中" />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {newest.data?.records.slice(0, 4).map((product) => (
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
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Leaf,
            title: "当季花材",
            description: "按季节与花期挑选，花礼更耐看也更自然。",
          },
          {
            icon: Gift,
            title: "手工包装",
            description: "花艺师逐束整理，保留花材原本的呼吸感。",
          },
          {
            icon: PackageCheck,
            title: "履约可追踪",
            description: "接单、备花、配送、签收，节点都清清楚楚。",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="ui-card flex items-start gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-5 py-5">
        <div>
          <p className="text-sm font-semibold">不知道送什么？先从场景开始。</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            生日、表白、纪念日、探望……按场合挑一束更合适的花。
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {occasions.map((occasion) => (
            <Link
              key={occasion}
              to={`/products?occasion=${encodeURIComponent(occasion)}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Flower2 className="h-3 w-3" />
              {occasion}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
