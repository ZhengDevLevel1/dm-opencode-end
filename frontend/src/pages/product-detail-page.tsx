import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  Leaf,
  Loader2,
  Minus,
  MessageSquareText,
  Plus,
  RotateCw,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import {
  cartService,
  favoriteService,
  productService,
  recommendationService,
  reviewService,
} from "@/lib/services";
import { useFavoritesQuery } from "@/hooks/queries";
import { useLoginGuard } from "@/hooks/use-login-guard";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { formatDateTime, formatNumber, splitTags } from "@/lib/format";
import { toast } from "@/stores/toast";
import { ProductImage } from "@/components/domain/product-image";
import { Price } from "@/components/domain/price";
import { Rating } from "@/components/domain/rating";
import { TagList } from "@/components/domain/tag-list";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import { SectionHeading } from "@/components/domain/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";

export function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requireLogin, isLoggedIn } = useLoginGuard();
  const favorites = useFavoritesQuery();
  const [quantity, setQuantity] = useState(1);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const product = useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => productService.detail(id),
    enabled: validId,
    staleTime: 60 * 1000,
    retry: false,
  });

  const reviews = useQuery({
    queryKey: queryKeys.reviewsProduct(id, { page: 1, size: showAllReviews ? 50 : 5 }),
    queryFn: () => reviewService.productReviews(id, { page: 1, size: showAllReviews ? 50 : 5 }),
    enabled: validId,
    staleTime: 60 * 1000,
  });

  const recommendations = useQuery({
    queryKey: queryKeys.recommendations({ limit: 6, scene: "product" }),
    queryFn: () => recommendationService.get({ limit: 6, scene: "product" }),
    enabled: validId,
    staleTime: queryPolicy.recommendations.staleTime,
  });

  const favoriteIds = useMemo(
    () => new Set(favorites.data?.map((item) => item.id) ?? []),
    [favorites.data],
  );
  const isFavorite = validId && favoriteIds.has(id);

  const addMutation = useMutation({
    mutationFn: (input: { productId: number; quantity: number }) =>
      cartService.add(input),
    onSuccess: () => {
      toast.success("已加入购物车", `${product.data?.name ?? "花礼"} 正在购物车里等你。`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
    onError: (error) => toast.error("加入购物车失败", getErrorMessage(error)),
  });

  const favoriteMutation = useMutation({
    mutationFn: (favorite: boolean) => (favorite ? favoriteService.add(id) : favoriteService.remove(id)),
    onSuccess: (_, favorite) => {
      toast.success(favorite ? "已收藏" : "已取消收藏");
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
    onError: (error) => toast.error("收藏操作失败", getErrorMessage(error)),
  });

  const handleAdd = async () => {
    if (!requireLogin() || !product.data) return;
    try {
      await addMutation.mutateAsync({ productId: id, quantity });
    } catch {
      /* toast handled */
    }
  };

  const handleBuyNow = async () => {
    if (!requireLogin() || !product.data) return;
    try {
      const item = await cartService.add({ productId: id, quantity });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      navigate(`/cart?selected=${item.id}`);
    } catch (error) {
      toast.error("无法立即购买", getErrorMessage(error));
    }
  };

  const handleFavorite = async () => {
    if (!requireLogin()) return;
    await favoriteMutation.mutateAsync(!isFavorite).catch(() => undefined);
  };

  if (!validId) {
    return (
      <EmptyState
        title="商品不存在"
        description="这件花礼可能已经被移除。"
        action={<Button onClick={() => navigate("/products")}>返回商品列表</Button>}
      />
    );
  }

  if (product.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (product.isError) {
    const error = product.error;
    const code = error instanceof ApiError ? error.code : 0;
    if (code === 2001 || code === 404) {
      return (
        <EmptyState
          title="商品不存在"
          description="这件花礼可能已经被移除，去看看其他当季花礼吧。"
          action={<Button onClick={() => navigate("/products")}>返回全部花礼</Button>}
        />
      );
    }
    if (code === 2002) {
      return (
        <EmptyState
          title="这件花礼已下架"
          description="花艺师正在调整，先看看其他花礼。"
          action={<Button onClick={() => navigate("/products")}>返回全部花礼</Button>}
        />
      );
    }
    return (
      <ErrorState
        description={getErrorMessage(error)}
        onRetry={() => void product.refetch()}
      />
    );
  }

  const data = product.data;
  if (!data) {
    return <EmptyState title="商品不存在" />;
  }

  const soldOut = data.stock <= 0;
  const lowStock = data.stock > 0 && data.stock < 10;
  const maxQuantity = Math.min(99, data.stock);
  const tags = splitTags(data.occasionTags);
  const festivalTags = splitTags(data.festivalTags);
  const related = recommendations.data?.items.filter((item) => item.productId !== id).slice(0, 4) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8">
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </Button>
        <span className="text-border">/</span>
        <Link to="/products" className="hover:text-foreground">
          全部花礼
        </Link>
        <span className="text-border">/</span>
        <span className="truncate text-foreground">{data.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:gap-8">
        <div className="ui-card overflow-hidden p-3">
          <ProductImage
            src={data.imageUrl}
            alt={data.name}
            seed={data.name}
            className="aspect-[4/5] w-full rounded-lg"
            iconClassName="h-16 w-16"
            overlay={
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
                <Badge variant="secondary">{data.priceBand}</Badge>
                {soldOut ? <Badge variant="destructive">售罄</Badge> : null}
              </div>
            }
          />
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
              {data.category} · {data.seasonLabel}
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-[28px]">
              {data.name}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data.flowerMeaning || "把当季的花，交给在意的人。"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Rating value={data.ratingAvg} count={data.ratingCount} />
              <span className="tabular">已售 {formatNumber(data.salesCount)}</span>
              <span className={lowStock ? "font-medium text-warning" : ""}>
                {soldOut ? "暂时售罄" : lowStock ? `仅剩 ${data.stock} 件` : `库存 ${data.stock} 件`}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <Price amount={data.price} originalAmount={data.originalPrice} size="lg" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              最终金额以下单结果为准，支付成功后花艺师开始备花。
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                适用场景
              </p>
              {tags.length > 0 ? <TagList tags={tags} max={8} tone="flower" /> : <p className="text-xs text-muted-foreground">—</p>}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                适合节日
              </p>
              {festivalTags.length > 0 ? <TagList tags={festivalTags} max={8} /> : <p className="text-xs text-muted-foreground">—</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center rounded-md border border-border">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="减少数量"
                className="h-10 w-10 rounded-none"
                disabled={quantity <= 1 || soldOut}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center text-sm font-medium tabular" aria-live="polite">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="增加数量"
                className="h-10 w-10 rounded-none"
                disabled={quantity >= maxQuantity || soldOut}
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              className="h-11 flex-1 sm:flex-none"
              disabled={soldOut || addMutation.isPending}
              onClick={handleAdd}
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              加入购物车
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1 sm:flex-none"
              disabled={soldOut}
              onClick={handleBuyNow}
            >
              立即购买
            </Button>
            <Tooltip content={isFavorite ? "取消收藏" : "收藏花礼"}>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                aria-label={isFavorite ? "取消收藏" : "收藏"}
                aria-pressed={isFavorite}
                disabled={favoriteMutation.isPending}
                onClick={handleFavorite}
              >
                {favoriteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={isFavorite ? "h-4 w-4 fill-flower-rose text-flower-rose" : "h-4 w-4"} />
                )}
              </Button>
            </Tooltip>
          </div>
          {soldOut ? (
            <p className="text-xs text-destructive">这件花礼暂时售罄，补货后即可购买。</p>
          ) : null}
          {!isLoggedIn ? (
            <p className="text-xs text-muted-foreground">
              登录后可以收藏花礼、加入购物车并跟踪履约进度。
            </p>
          ) : null}

          <div className="grid gap-2 rounded-xl border border-border/60 p-4 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-flower-leaf" />
              <span className="text-muted-foreground">当季花材</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-flower-amber" />
              <span className="text-muted-foreground">手工包装</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">履约可追踪</span>
            </div>
          </div>
        </div>
      </div>

      <section className="ui-card p-5">
        <SectionHeading title="花礼说明" description="花材搭配、包装与养护建议" />
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {data.description || "花艺师会根据当季花材状态进行搭配，实际花材可能略有调整。"}
        </p>
      </section>

      <section className="ui-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            title="花友评价"
            description="来自已完成订单的真实评价，仅展示可见评价。"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Rating value={data.ratingAvg} count={data.ratingCount} />
          </div>
        </div>

        {reviews.isLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : reviews.isError ? (
          <ErrorState
            className="mt-4"
            compact
            description="评价没有加载成功。"
            onRetry={() => void reviews.refetch()}
          />
        ) : (reviews.data?.records.length ?? 0) === 0 ? (
          <EmptyState
            className="mt-4"
            icon={MessageSquareText}
            title="还没有评价"
            description="收到花后，欢迎回来留下第一束花的感受。"
            bare
          />
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {reviews.data?.records.map((review) => (
                <article key={review.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{review.nickname || "花友"}</span>
                      <Rating value={review.rating} showValue={false} compact />
                      <span className="text-xs text-muted-foreground tabular">{review.rating} 分</span>
                    </div>
                    <time className="text-[11px] text-muted-foreground tabular">
                      {formatDateTime(review.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {review.content || "这位花友只留下了评分。"}
                  </p>
                  {review.reply ? (
                    <div className="mt-2 rounded-lg bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">店家回复：</span>
                      {review.reply}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            {!showAllReviews && (reviews.data?.total ?? 0) > 5 ? (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setShowAllReviews(true)}
              >
                查看全部 {reviews.data?.total} 条评价
                <ChevronDown className="h-4 w-4" />
              </Button>
            ) : null}
          </>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="You may also like"
          title="猜你喜欢"
          description="结合当季与热度的其他花礼。"
        />
        {recommendations.isLoading ? (
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-72 w-full" />
            ))}
          </div>
        ) : related.length === 0 ? (
          <EmptyState className="mt-4" title="暂时没有更多推荐" />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <RecommendationCard key={item.productId} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
