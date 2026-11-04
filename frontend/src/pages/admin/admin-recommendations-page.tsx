import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Target,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { toast } from "@/stores/toast";
import type {
  RecommendationLogQuery,
  RecommendationLogVO,
  RecommendationWeightRequest,
  RecommendationWeightsVO,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LOG_PAGE_SIZE = 10;

const defaultWeights: RecommendationWeightRequest = {
  contentWeight: 0.4,
  popularityWeight: 0.2,
  festivalWeight: 0.25,
  ratingWeight: 0.15,
};

const weightFields: Array<{
  key: keyof RecommendationWeightRequest;
  label: string;
  description: string;
}> = [
  {
    key: "contentWeight",
    label: "内容相似度",
    description: "用户偏好与商品品类、花语、场景标签的匹配程度。",
  },
  {
    key: "popularityWeight",
    label: "热度",
    description: "销量与近期受欢迎程度。",
  },
  {
    key: "festivalWeight",
    label: "节日 / 季节",
    description: "当前节日与当季花材的适配程度。",
  },
  {
    key: "ratingWeight",
    label: "评分",
    description: "商品平均评分与评价数量。",
  },
];

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function weightsSum(weights: RecommendationWeightRequest): number {
  return round3(
    weights.contentWeight +
      weights.popularityWeight +
      weights.festivalWeight +
      weights.ratingWeight,
  );
}

function toWeightRequest(weights: RecommendationWeightsVO): RecommendationWeightRequest {
  return {
    contentWeight: weights.contentWeight,
    popularityWeight: weights.popularityWeight,
    festivalWeight: weights.festivalWeight,
    ratingWeight: weights.ratingWeight,
  };
}

function normalizeWeights(weights: RecommendationWeightRequest): RecommendationWeightRequest {
  const keys = weightFields.map((field) => field.key);
  const sum = keys.reduce((total, key) => total + weights[key], 0);
  if (sum <= 0) return { ...defaultWeights };
  const normalized = { ...weights };
  let allocated = 0;
  let cumulative = 0;
  keys.forEach((key, index) => {
    cumulative += weights[key] / sum;
    const boundary = index === keys.length - 1 ? 1 : round3(cumulative);
    normalized[key] = round3(boundary - allocated);
    allocated = round3(allocated + normalized[key]);
  });
  return normalized;
}

export function AdminRecommendationsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => (searchParams.get("userId") ? "logs" : "weights"));
  const userIdParam = searchParams.get("userId");

  useEffect(() => {
    if (userIdParam) setTab("logs");
  }, [userIdParam]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">推荐运营</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          调整推荐权重、查看离线评估与最近推荐日志。权重之和必须严格等于 1。
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="weights">
            <span className="inline-flex items-center gap-1.5">
              <WandSparkles className="h-3.5 w-3.5" />
              权重配置
            </span>
          </TabsTrigger>
          <TabsTrigger value="evaluation">
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              效果评估
            </span>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              覆盖率统计
            </span>
          </TabsTrigger>
          <TabsTrigger value="logs">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              推荐日志
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weights" className="mt-4">
          <WeightsSection />
        </TabsContent>
        <TabsContent value="evaluation" className="mt-4">
          <EvaluationSection />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <StatsSection />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <LogsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WeightsSection() {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<RecommendationWeightRequest | null>(null);
  const weightsQuery = useQuery({
    queryKey: queryKeys.adminRecommendationWeights,
    queryFn: adminService.weights,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!weightsQuery.data) return;
    const data = weightsQuery.data;
    setWeights({
      contentWeight: data.contentWeight,
      popularityWeight: data.popularityWeight,
      festivalWeight: data.festivalWeight,
      ratingWeight: data.ratingWeight,
    });
  }, [weightsQuery.data]);

  const mutation = useMutation({
    mutationFn: (body: RecommendationWeightRequest) => adminService.saveWeights(body),
    onSuccess: (saved) => {
      toast.success("推荐权重已保存", "后续推荐请求会使用新权重。");
      setWeights({
        contentWeight: saved.contentWeight,
        popularityWeight: saved.popularityWeight,
        festivalWeight: saved.festivalWeight,
        ratingWeight: saved.ratingWeight,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminRecommendationWeights,
      });
    },
    onError: (error) => toast.error("权重保存失败", getErrorMessage(error)),
  });

  const current = weights ?? weightsQuery.data ?? defaultWeights;
  const sum = weightsSum(current);
  const roundedSum = round3(
    round3(current.contentWeight) +
      round3(current.popularityWeight) +
      round3(current.festivalWeight) +
      round3(current.ratingWeight),
  );
  const valid = Math.abs(sum - 1) <= 0.001 && roundedSum === 1;
  const changed =
    weightsQuery.data &&
    (round3(weightsQuery.data.contentWeight) !== round3(current.contentWeight) ||
      round3(weightsQuery.data.popularityWeight) !== round3(current.popularityWeight) ||
      round3(weightsQuery.data.festivalWeight) !== round3(current.festivalWeight) ||
      round3(weightsQuery.data.ratingWeight) !== round3(current.ratingWeight));

  if (weightsQuery.isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (weightsQuery.isError) {
    return (
      <ErrorState
        title="推荐权重没送到"
        description={getErrorMessage(weightsQuery.error)}
        onRetry={() => void weightsQuery.refetch()}
      />
    );
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1fr_320px]">
      <section className="ui-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">推荐权重</h2>
          <Badge variant={valid ? "success" : "destructive"}>
            当前总和 {sum.toFixed(3)}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          四项权重各取 0-1，四舍五入到 3 位小数后必须严格等于 1；原始和偏差也不能超过 0.001。
        </p>

        <div className="mt-5 space-y-5">
          {weightFields.map((field) => {
            const value = current[field.key];
            return (
              <div key={field.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label htmlFor={`weight-${field.key}`} className="text-xs">
                      {field.label}
                    </Label>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                  <Input
                    id={`weight-${field.key}`}
                    type="number"
                    min={0}
                    max={1}
                    step={0.001}
                    value={value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setWeights((previous) => ({
                        ...(previous ?? current),
                        [field.key]: Number.isFinite(next)
                          ? Math.min(1, Math.max(0, next))
                          : 0,
                      }));
                    }}
                    className="h-8 w-24 text-right font-mono-ui text-xs"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={value}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setWeights((previous) => ({
                      ...(previous ?? current),
                      [field.key]: next,
                    }));
                  }}
                  className="mt-2 w-full accent-[var(--primary)]"
                  aria-label={`${field.label}权重`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeights(normalizeWeights(current))}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              归一化
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeights({ ...defaultWeights })}
            >
              填入默认值
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (weightsQuery.data) setWeights(toWeightRequest(weightsQuery.data));
              }}
              disabled={!changed}
            >
              还原修改
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => mutation.mutate(current)}
            loading={mutation.isPending}
            disabled={!valid || !changed}
          >
            <Save className="h-3.5 w-3.5" />
            保存权重
          </Button>
        </div>

        {!valid ? (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/[0.04] px-3 py-2 text-xs text-destructive">
            权重之和需要等于 1。当前为 {sum.toFixed(3)}，可以点击「归一化」自动调整。
          </p>
        ) : null}
      </section>

      <aside className="space-y-4">
        <section className="ui-card p-4">
          <h2 className="text-sm font-semibold tracking-tight">权重说明</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            推荐分数由内容相似度、热度、节日季节匹配与评分加权得到。修改只影响后续请求，
            历史推荐日志不会变化。
          </p>
          <div className="mt-3 space-y-2">
            {weightFields.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{field.label}</span>
                <span className="font-medium tabular">{formatPercent(current[field.key])}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="ui-card p-4">
          <h2 className="text-sm font-semibold tracking-tight">最近更新</h2>
          {weightsQuery.data ? (
            <dl className="mt-2 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">操作人</dt>
                <dd>{weightsQuery.data.updatedBy ? `#${weightsQuery.data.updatedBy}` : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">更新时间</dt>
                <dd className="tabular">
                  {formatDateTime(weightsQuery.data.updatedAt)}
                </dd>
              </div>
            </dl>
          ) : null}
          <p className="mt-3 rounded-md bg-muted/60 px-2.5 py-2 text-[11px] text-muted-foreground">
            默认权重：内容 0.4 · 热度 0.2 · 节日 0.25 · 评分 0.15
          </p>
        </section>
      </aside>
    </div>
  );
}

function EvaluationSection() {
  const evaluation = useQuery({
    queryKey: queryKeys.adminRecommendationEvaluation,
    queryFn: adminService.evaluation,
    staleTime: 60_000,
  });

  if (evaluation.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (evaluation.isError) {
    return (
      <ErrorState
        title="推荐评估没送到"
        description={getErrorMessage(evaluation.error)}
        onRetry={() => void evaluation.refetch()}
      />
    );
  }

  const evalData = evaluation.data;

  return (
    <div className="space-y-4">
      <section className="ui-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">五类画像离线评估</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              覆盖全部 {formatNumber(evalData?.totalProducts)} 件商品，整体覆盖率{" "}
              {formatPercent(evalData?.overallCoverage)}。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={evaluation.isFetching}
            onClick={() => void evaluation.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新评估
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(evalData?.personas ?? []).map((persona) => (
            <article
              key={persona.name}
              className="rounded-lg border border-border/60 p-3.5 transition-colors hover:bg-muted/25"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold">{persona.name}</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {persona.description}
                  </p>
                </div>
                <Badge variant={persona.coldStart ? "warning" : "secondary"}>
                  {persona.coldStart ? "冷启动" : "常规"}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <dt className="text-[10px] text-muted-foreground">Top-10 命中</dt>
                  <dd className="mt-0.5 text-xs font-medium tabular">
                    {persona.hitRate === 1 ? "命中" : "未命中"}
                  </dd>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <dt className="text-[10px] text-muted-foreground">相关商品</dt>
                  <dd className="mt-0.5 text-xs font-medium tabular">
                    {formatNumber(persona.relevantCount)} / {formatNumber(persona.itemCount)}
                  </dd>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <dt className="text-[10px] text-muted-foreground">覆盖率</dt>
                  <dd className="mt-0.5 text-xs font-medium tabular">
                    {formatPercent(persona.coverage)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Precision@10</span>
                  <span className="tabular">{formatPercent(persona.precisionAt10)}</span>
                </div>
                <Progress value={persona.precisionAt10 * 100} />
              </div>
              {persona.sampleReason ? (
                <p className="mt-2.5 line-clamp-2 rounded-md bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground">
                  示例理由：{persona.sampleReason}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          评估生成于 {formatDateTime(evalData?.generatedAt)}
        </p>
      </section>
    </div>
  );
}

function StatsSection() {
  const stats = useQuery({
    queryKey: queryKeys.adminRecommendationStats,
    queryFn: adminService.recommendationStats,
    staleTime: 60_000,
  });

  if (stats.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (stats.isError) {
    return (
      <ErrorState
        title="推荐覆盖率没送到"
        description={getErrorMessage(stats.error)}
        onRetry={() => void stats.refetch()}
      />
    );
  }

  const statsData = stats.data;

  return (
    <div className="space-y-4">
      <section className="ui-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">推荐覆盖率</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              近 30 天窗口；匿名请求计入总请求，但不计入去重用户。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={stats.isFetching}
            onClick={() => void stats.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <EvalStat
            icon={Activity}
            label="近 30 天请求"
            value={formatNumber(statsData?.totalRequests)}
          />
          <EvalStat
            icon={UserRound}
            label="去重用户数"
            value={formatNumber(statsData?.distinctUsers)}
          />
          <EvalStat
            icon={Sparkles}
            label="推荐过的商品"
            value={formatNumber(statsData?.distinctRecommendedProducts)}
          />
          <EvalStat
            icon={Target}
            label="推荐覆盖率"
            value={formatPercent(statsData?.coverage)}
          />
          <EvalStat
            icon={BarChart3}
            label="在售商品数"
            value={formatNumber(statsData?.onSaleProducts)}
          />
        </div>
      </section>

      <section className="ui-card p-4">
        <h2 className="text-sm font-semibold tracking-tight">近 30 天高频推荐商品</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          商品名称来自管理员商品详情接口，获取失败时回退显示商品 ID。
        </p>
        {(statsData?.topRecommendedProductIds.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {statsData?.topRecommendedProductIds.map((id) => (
              <RecommendedProductChip key={id} id={id} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">暂无高频推荐商品。</p>
        )}
      </section>
    </div>
  );
}

function RecommendedProductChip({ id }: { id: string }) {
  const productId = Number(id);
  const query = useQuery({
    queryKey: queryKeys.adminProduct(productId),
    queryFn: () => adminService.product(productId),
    enabled: Number.isInteger(productId) && productId > 0,
    retry: false,
    staleTime: 60_000,
  });
  const label = query.data?.name ?? `商品 #${id}`;
  return (
    <Link
      to={`/admin/products?keyword=${encodeURIComponent(query.data?.name ?? "")}`}
      className="max-w-56 truncate rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
      title={label}
    >
      {label}
    </Link>
  );
}

function LogsSection() {
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId") ?? "";
  const [draft, setDraft] = useState({
    userId: userIdParam,
    start: "",
    end: "",
  });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<RecommendationLogVO | null>(null);

  useEffect(() => {
    if (!userIdParam) return;
    setDraft((current) => ({ ...current, userId: userIdParam }));
    setFilters((current) => ({ ...current, userId: userIdParam }));
    setPage(1);
  }, [userIdParam]);

  const params = useMemo<RecommendationLogQuery>(() => {
    const query: RecommendationLogQuery = { page, size: LOG_PAGE_SIZE };
    const userId = Number(filters.userId);
    if (filters.userId.trim() && Number.isInteger(userId) && userId > 0) query.userId = userId;
    if (filters.start) query.start = `${filters.start}T00:00:00`;
    if (filters.end) query.end = `${filters.end}T23:59:59`;
    return query;
  }, [page, filters]);

  const query = useQuery({
    queryKey: queryKeys.adminRecommendationLogs(params),
    queryFn: () => adminService.recommendationLogs(params),
    placeholderData: (previous) => previous,
  });

  const activeFilters = [filters.userId, filters.start, filters.end].filter(Boolean).length;
  const records = query.data?.records ?? [];

  return (
    <div className="space-y-4">
      <div className="ui-card p-4">
        <form
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-10"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters(draft);
            setPage(1);
          }}
        >
          <div className="xl:col-span-2">
            <Label htmlFor="log-user-id" className="sr-only">
              用户 ID
            </Label>
            <Input
              id="log-user-id"
              value={draft.userId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, userId: event.target.value }))
              }
              placeholder="用户 ID"
              inputMode="numeric"
              className="h-9 text-xs"
            />
          </div>
          <div className="xl:col-span-3">
            <Label htmlFor="log-start" className="sr-only">
              开始日期
            </Label>
            <Input
              id="log-start"
              type="date"
              value={draft.start}
              onChange={(event) =>
                setDraft((current) => ({ ...current, start: event.target.value }))
              }
              className="h-9 text-xs"
              aria-label="开始日期"
            />
          </div>
          <div className="xl:col-span-3">
            <Label htmlFor="log-end" className="sr-only">
              结束日期
            </Label>
            <Input
              id="log-end"
              type="date"
              value={draft.end}
              onChange={(event) =>
                setDraft((current) => ({ ...current, end: event.target.value }))
              }
              className="h-9 text-xs"
              aria-label="结束日期"
            />
          </div>
          <div className="flex gap-2 xl:col-span-2">
            <Button type="submit" size="sm" className="h-9 flex-1">
              <Search className="h-3.5 w-3.5" />
              筛选
            </Button>
            {activeFilters > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2"
                onClick={() => {
                  const empty = { userId: "", start: "", end: "" };
                  setDraft(empty);
                  setFilters(empty);
                  setPage(1);
                }}
                aria-label="清除筛选"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            共 {formatNumber(query.data?.total)} 条推荐请求
          </div>
          <p className="text-[11px] text-muted-foreground">匿名请求的 userId 为空</p>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="推荐日志没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={activeFilters > 0 ? "没有符合筛选条件的日志" : "还没有推荐日志"}
            description={
              activeFilters > 0
                ? "试试清除筛选条件，或换一个用户 ID / 时间范围。"
                : "用户访问推荐页后，请求记录会出现在这里。"
            }
            bare
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>时间</TH>
                  <TH>用户</TH>
                  <TH>场景</TH>
                  <TH>季节 / 节日</TH>
                  <TH>冷启动</TH>
                  <TH>推荐商品</TH>
                  <TH className="text-right">详情</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((log) => {
                  const productIds = log.productIds
                    ? log.productIds.split(",").map((id) => id.trim()).filter(Boolean)
                    : [];
                  return (
                    <TR key={log.id}>
                      <TD className="whitespace-nowrap py-3 text-[11px] text-muted-foreground tabular">
                        {formatDateTime(log.createdAt)}
                      </TD>
                      <TD className="text-xs">
                        {log.userId ? (
                          <Link
                            to={`/admin/recommendations?userId=${log.userId}`}
                            className="text-primary hover:underline"
                          >
                            #{log.userId}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">匿名</span>
                        )}
                      </TD>
                      <TD>
                        <Badge variant="outline">{log.scene || "默认"}</Badge>
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {log.season}
                        {log.festival ? ` · ${log.festival}` : ""}
                      </TD>
                      <TD>
                        <Badge variant={log.coldStart ? "warning" : "secondary"}>
                          {log.coldStart ? "是" : "否"}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex max-w-64 flex-wrap gap-1">
                          {productIds.slice(0, 4).map((id) => (
                            <Link
                              key={id}
                              to={`/products/${id}`}
                              className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary"
                            >
                              #{id}
                            </Link>
                          ))}
                          {productIds.length > 4 ? (
                            <span className="text-[10px] text-muted-foreground">
                              +{productIds.length - 4}
                            </span>
                          ) : null}
                          {productIds.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setDetail(log)}
                        >
                          查看
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
              pageSize={LOG_PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        title={`推荐日志 #${detail?.id ?? ""}`}
        description={
          detail
            ? `${formatDateTime(detail.createdAt)} · ${detail.scene || "默认场景"} · ${
                detail.coldStart ? "冷启动" : "常规推荐"
              }`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="outline" size="sm" onClick={() => setDetail(null)}>
            关闭
          </Button>
        }
      >
        {detail ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-[10px] text-muted-foreground">用户</dt>
                <dd className="mt-0.5">{detail.userId ? `#${detail.userId}` : "匿名"}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">场景</dt>
                <dd className="mt-0.5">{detail.scene || "默认"}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">季节</dt>
                <dd className="mt-0.5">{detail.season}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">节日</dt>
                <dd className="mt-0.5">{detail.festival || "—"}</dd>
              </div>
            </dl>
            <div>
              <h3 className="text-xs font-semibold">推荐商品</h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(detail.productIds ?? "")
                  .split(",")
                  .map((id) => id.trim())
                  .filter(Boolean)
                  .map((id) => (
                    <Link
                      key={id}
                      to={`/products/${id}`}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      #{id}
                    </Link>
                  ))}
                {!detail.productIds ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : null}
              </div>
            </div>
            <JsonBlock label="权重快照 weightsJson" value={detail.weightsJson} />
            <JsonBlock label="推荐明细 detailJson" value={detail.detailJson} />
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value?: string }) {
  let formatted = "—";
  if (value) {
    try {
      formatted = JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      formatted = value;
    }
  }
  return (
    <div>
      <h3 className="text-xs font-semibold">{label}</h3>
      <pre className="mt-1.5 max-h-52 overflow-auto rounded-lg bg-muted/60 p-3 font-mono-ui text-[11px] leading-relaxed">
        {formatted}
      </pre>
    </div>
  );
}

function EvalStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="ui-card flex items-center gap-2.5 px-3.5 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold tracking-tight tabular">{value}</p>
      </div>
    </div>
  );
}
