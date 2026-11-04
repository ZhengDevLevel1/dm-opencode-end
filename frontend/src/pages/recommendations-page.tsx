import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarHeart, RotateCcw, Sparkles, Sprout } from "lucide-react";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import { cartService, favoriteService, recommendationService } from "@/lib/services";
import { useDict, useFavoritesQuery } from "@/hooks/queries";
import { useLoginGuard } from "@/hooks/use-login-guard";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, formatPercent } from "@/lib/format";
import { toast } from "@/stores/toast";
import type { RecommendationItemVO, SeasonSuitability } from "@/types/api";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import { SectionHeading } from "@/components/domain/section-heading";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Label } from "@/components/ui/label";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";

const SEASON_VALUES: SeasonSuitability[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER", "ALL"];
const LIMIT_OPTIONS = [6, 10, 20];
const LIMIT_SELECT_OPTIONS = LIMIT_OPTIONS.map((item) => ({
  value: String(item),
  label: `${item} 件`,
}));

const weightLabels = [
  { key: "contentWeight", label: "内容相似度" },
  { key: "popularityWeight", label: "销量热度" },
  { key: "festivalWeight", label: "节日匹配" },
  { key: "ratingWeight", label: "评分表现" },
] as const;

export function RecommendationsPage() {
  const [params, setParams] = useSearchParams();
  const dict = useDict();
  const queryClient = useQueryClient();
  const { requireLogin } = useLoginGuard();
  const favorites = useFavoritesQuery();
  const [favPendingId, setFavPendingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  const seasonParam = params.get("season") ?? "";
  const season = SEASON_VALUES.includes(seasonParam as SeasonSuitability)
    ? (seasonParam as SeasonSuitability)
    : undefined;
  const festival = params.get("festival") ?? undefined;
  const limitParam = Number(params.get("limit") ?? "10");
  const limit = LIMIT_OPTIONS.includes(limitParam) ? limitParam : 10;

  const seasonOptions = useMemo(
    () => (dict.data?.seasons ?? []).map((item) => ({ value: item.value, label: item.label })),
    [dict.data?.seasons],
  );
  const festivalOptions = useMemo(
    () => (dict.data?.festivals ?? []).map((item) => ({ value: item, label: item })),
    [dict.data?.festivals],
  );

  const query = useMemo(
    () => ({ limit, festival, season, scene: "home" }),
    [limit, festival, season],
  );

  const recommendations = useQuery({
    queryKey: queryKeys.recommendations(query),
    queryFn: () => recommendationService.get(query),
    staleTime: queryPolicy.recommendations.staleTime,
  });

  const favoriteIds = useMemo(
    () => new Set(favorites.data?.map((product) => product.id) ?? []),
    [favorites.data],
  );

  const favoriteMutation = useMutation({
    mutationFn: ({ productId, favorite }: { productId: number; favorite: boolean }) =>
      favorite ? favoriteService.add(productId) : favoriteService.remove(productId),
    onSuccess: (_, variables) => {
      toast.success(variables.favorite ? "已收藏" : "已取消收藏");
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
    onError: (error) => toast.error("收藏操作失败", getErrorMessage(error)),
  });

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setParams(next);
  };

  const handleFavorite = async (item: RecommendationItemVO) => {
    if (!requireLogin()) return;
    setFavPendingId(item.productId);
    try {
      await favoriteMutation.mutateAsync({
        productId: item.productId,
        favorite: !favoriteIds.has(item.productId),
      });
    } finally {
      setFavPendingId(null);
    }
  };

  const handleAdd = async (item: RecommendationItemVO) => {
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

  const data = recommendations.data;
  const currentSeasonLabel =
    data?.seasonLabel ?? dict.data?.seasons.find((item) => item.value === season)?.label ?? "当季";

  return (
    <div className="space-y-6">
      <section className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] md:p-7">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(42rem 20rem at 100% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%)",
          }}
          aria-hidden
        />
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium tracking-[0.14em] text-primary uppercase">
              <Sparkles className="h-3 w-3" />
              Explainable recommendation
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              为你挑一束，理由也说清楚。
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              推荐依据内容相似度、销量热度、节日季节与评分四项权重综合排序。
              不登录时会按当季与热度做冷启动推荐。
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32 space-y-1.5">
              <Label htmlFor="rec-season">季节</Label>
              <CustomSelect
                id="rec-season"
                value={season ?? ""}
                onChange={(next) => updateParams({ season: next || undefined })}
                options={seasonOptions}
                placeholder="自动识别"
              />
            </div>
            <div className="w-36 space-y-1.5">
              <Label htmlFor="rec-festival">节日</Label>
              <CustomSelect
                id="rec-festival"
                value={festival ?? ""}
                onChange={(next) => updateParams({ festival: next || undefined })}
                options={festivalOptions}
                placeholder="自动识别"
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="rec-limit">推荐数量</Label>
              <CustomSelect
                id="rec-limit"
                value={String(limit)}
                onChange={(next) => updateParams({ limit: next })}
                options={LIMIT_SELECT_OPTIONS}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="重置推荐条件"
              onClick={() => setParams(new URLSearchParams())}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {data?.coldStart ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sprout className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">正在按当季与热度推荐</p>
            <p className="text-xs text-muted-foreground">
              登录后，系统会结合你的收藏、评价与近期订单生成更贴合的花礼推荐。
            </p>
          </div>
          <span className="rounded-full bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            冷启动
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarHeart className="h-3.5 w-3.5" />
          {currentSeasonLabel}
          {data?.festival ? ` · ${data.festival}` : ""}
          {data ? ` · 共 ${data.items.length} 件推荐` : ""}
        </p>
        {data ? (
          <p className="text-[11px] text-muted-foreground">
            生成于 {formatDateTime(data.generatedAt)} · 策略 {data.strategy}
          </p>
        ) : null}
      </div>

      {recommendations.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: Math.min(limit, 8) }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : recommendations.isError ? (
        <ErrorState
          description={getErrorMessage(recommendations.error)}
          onRetry={() => void recommendations.refetch()}
        />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="当季花礼正在准备中"
          description="暂时没有可推荐的花礼。换一个季节或节日试试，或直接浏览全部花礼。"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data?.items.map((item) => (
            <RecommendationCard
              key={item.productId}
              item={item}
              isFavorite={favoriteIds.has(item.productId)}
              favoritePending={favPendingId === item.productId}
              addPending={addingId === item.productId}
              onFavorite={handleFavorite}
              onAddToCart={handleAdd}
              showScores
            />
          ))}
        </div>
      )}

      {data ? (
        <section className="ui-card p-5">
          <SectionHeading
            title="本轮推荐权重"
            description="权重由管理员配置，可解释、可追溯。"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {weightLabels.map((item) => {
              const value = data.weights[item.key];
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular">{formatPercent(value, 1)}</span>
                  </div>
                  <Progress value={value * 100} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
