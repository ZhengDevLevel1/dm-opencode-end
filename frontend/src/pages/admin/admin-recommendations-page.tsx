import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  FlaskConical,
  Layers,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Target,
  TrendingUp,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { adminService, recommendationOpsService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { PAGE_SIZE_OPTIONS } from "@/lib/page-size-options";
import { toast } from "@/stores/toast";
import type {
  RecommendationExperimentRequest,
  RecommendationExperimentVO,
  RecommendationLogQuery,
  RecommendationLogVO,
  RecommendationScene,
  RecommendationSceneWeightRequest,
  RecommendationSceneWeightVO,
  RecommendationWeightRequest,
  RecommendationWeightsVO,
} from "@/types/api";
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
import { Progress } from "@/components/ui/progress";
import { RangeSlider } from "@/components/ui/range-slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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

const sceneDescriptions: Record<RecommendationScene, string> = {
  home: "首页首屏与推荐卡片，兼顾当季节日氛围。",
  catalog: "全部花礼默认综合排序，突出内容、热度与评分平衡。",
  recommendations: "智能推荐页，更侧重用户长期行为与收藏偏好。",
  product: "商品详情相似推荐，以当前商品为种子并排除自身。",
  garden: "旧版花园入口，沿用首页权重。",
};

const sceneLabels: Record<string, string> = {
  home: "首页",
  catalog: "全部花礼",
  recommendations: "智能推荐",
  product: "商品详情",
  garden: "花园",
  UNKNOWN: "未知场景",
};

const effectDayOptions = [
  { value: "7", label: "近 7 天" },
  { value: "30", label: "近 30 天" },
  { value: "90", label: "近 90 天" },
];

const experimentSceneOptions = [
  { value: "home", label: "首页推荐" },
  { value: "catalog", label: "全部花礼" },
  { value: "recommendations", label: "智能推荐" },
  { value: "product", label: "商品详情" },
];

const experimentModeOptions = [
  { value: "AB", label: "A/B 分流" },
  { value: "SHADOW", label: "影子模式" },
];

const experimentStatusOptions = [
  { value: "PAUSED", label: "已暂停" },
  { value: "RUNNING", label: "运行中" },
  { value: "STOPPED", label: "已停止" },
];

const experimentMetricOptions = [
  { value: "CTR", label: "点击率 CTR" },
  { value: "CVR", label: "转化率 CVR" },
];

const emptyExperiment: RecommendationExperimentRequest = {
  id: "",
  name: "",
  scene: "home",
  mode: "AB",
  trafficPercent: 10,
  status: "PAUSED",
  primaryMetric: "CTR",
  configJson: "",
};

function experimentStatusVariant(status: string) {
  if (status === "RUNNING") return "success" as const;
  if (status === "PAUSED") return "warning" as const;
  return "secondary" as const;
}

function experimentStatusLabel(status: string) {
  return experimentStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function variantLabel(variant: string) {
  if (variant === "TREATMENT") return "实验组";
  if (variant === "CONTROL") return "对照组";
  return variant || "默认";
}

function weightsSum(weights: RecommendationWeightRequest): number {
  return round3(
    weights.contentWeight +
      weights.popularityWeight +
      weights.festivalWeight +
      weights.ratingWeight,
  );
}

function roundedWeightsSum(weights: RecommendationWeightRequest): number {
  return round3(
    round3(weights.contentWeight) +
      round3(weights.popularityWeight) +
      round3(weights.festivalWeight) +
      round3(weights.ratingWeight),
  );
}

function weightsValid(weights: RecommendationWeightRequest): boolean {
  const rawSum =
    weights.contentWeight +
    weights.popularityWeight +
    weights.festivalWeight +
    weights.ratingWeight;
  return Math.abs(rawSum - 1) <= 0.001 && roundedWeightsSum(weights) === 1;
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
  const [tab, setTab] = useState(() =>
    searchParams.get("keyword") ? "logs" : "scene-weights",
  );
  const keywordParam = searchParams.get("keyword");

  useEffect(() => {
    if (keywordParam) setTab("logs");
  }, [keywordParam]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">推荐运营</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          按场景调整推荐权重、查看曝光点击效果与实验分流，并追踪最近推荐日志。每个场景的四项权重之和必须严格等于 1。
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scene-weights">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              场景权重
            </span>
          </TabsTrigger>
          <TabsTrigger value="weights">
            <span className="inline-flex items-center gap-1.5">
              <WandSparkles className="h-3.5 w-3.5" />
              兜底权重
            </span>
          </TabsTrigger>
          <TabsTrigger value="evaluation">
            <span className="inline-flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              效果评估
            </span>
          </TabsTrigger>
          <TabsTrigger value="effects">
            <span className="inline-flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" />
              曝光效果
            </span>
          </TabsTrigger>
          <TabsTrigger value="experiments">
            <span className="inline-flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              实验管理
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

        <TabsContent value="scene-weights" className="mt-4">
          <SceneWeightsSection />
        </TabsContent>
        <TabsContent value="weights" className="mt-4">
          <WeightsSection />
        </TabsContent>
        <TabsContent value="evaluation" className="mt-4">
          <EvaluationSection />
        </TabsContent>
        <TabsContent value="effects" className="mt-4">
          <EffectsSection />
        </TabsContent>
        <TabsContent value="experiments" className="mt-4">
          <ExperimentsSection />
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

function SceneWeightsSection() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, RecommendationSceneWeightRequest>>({});
  const sceneQuery = useQuery({
    queryKey: queryKeys.adminRecommendationSceneWeights,
    queryFn: adminService.sceneWeights,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!sceneQuery.data) return;
    const next: Record<string, RecommendationSceneWeightRequest> = {};
    sceneQuery.data.forEach((scene) => {
      next[scene.scene] = {
        scene: scene.scene,
        contentWeight: scene.contentWeight,
        popularityWeight: scene.popularityWeight,
        festivalWeight: scene.festivalWeight,
        ratingWeight: scene.ratingWeight,
        enabled: scene.enabled,
      };
    });
    setDraft(next);
  }, [sceneQuery.data]);

  const mutation = useMutation({
    mutationFn: adminService.saveSceneWeights,
    onSuccess: (saved) => {
      toast.success("场景权重已保存", "后续各入口推荐请求会使用对应场景权重。");
      const next: Record<string, RecommendationSceneWeightRequest> = {};
      saved.forEach((scene) => {
        next[scene.scene] = {
          scene: scene.scene,
          contentWeight: scene.contentWeight,
          popularityWeight: scene.popularityWeight,
          festivalWeight: scene.festivalWeight,
          ratingWeight: scene.ratingWeight,
          enabled: scene.enabled,
        };
      });
      setDraft(next);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminRecommendationSceneWeights,
      });
    },
    onError: (error) => toast.error("场景权重保存失败", getErrorMessage(error)),
  });

  const scenes = sceneQuery.data ?? [];
  const currentFor = (scene: RecommendationSceneWeightVO) => draft[scene.scene] ?? scene;
  const valid = scenes.every((scene) => weightsValid(currentFor(scene)));
  const dirty = scenes.some((scene) => {
    const current = draft[scene.scene];
    if (!current) return false;
    return (
      round3(current.contentWeight) !== round3(scene.contentWeight) ||
      round3(current.popularityWeight) !== round3(scene.popularityWeight) ||
      round3(current.festivalWeight) !== round3(scene.festivalWeight) ||
      round3(current.ratingWeight) !== round3(scene.ratingWeight) ||
      (current.enabled ?? true) !== scene.enabled
    );
  });

  const updateField = (
    scene: RecommendationSceneWeightVO,
    patch: Partial<RecommendationSceneWeightRequest>,
  ) => {
    setDraft((previous) => ({
      ...previous,
      [scene.scene]: {
        ...(previous[scene.scene] ?? scene),
        ...patch,
        scene: scene.scene,
      },
    }));
  };

  if (sceneQuery.isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (sceneQuery.isError) {
    return (
      <ErrorState
        title="场景权重没送到"
        description={getErrorMessage(sceneQuery.error)}
        onRetry={() => void sceneQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="ui-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">场景权重配置</h2>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
              首页、全部花礼、智能推荐与商品详情分别使用独立权重；关闭某个场景后会回退到兜底权重。
              商品详情以当前商品为种子，不会重复推荐当前商品。
            </p>
          </div>
          <Badge variant={valid ? "success" : "destructive"}>
            {valid ? "全部场景和 = 1" : "存在权重和不为 1 的场景"}
          </Badge>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {scenes.map((scene) => {
          const current = currentFor(scene);
          const sum = weightsSum(current);
          const sceneValid = weightsValid(current);
          return (
            <article key={scene.scene} className="ui-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tight">{scene.sceneLabel}</h3>
                    <Badge variant={current.enabled ? "secondary" : "outline"}>
                      {current.enabled ? "启用" : "已关闭"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {sceneDescriptions[scene.scene] ?? scene.scene}
                  </p>
                </div>
                <Switch
                  checked={current.enabled ?? true}
                  onCheckedChange={(checked) => updateField(scene, { enabled: checked })}
                  label={`${scene.sceneLabel}启用状态`}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {weightFields.map((field) => {
                  const value = current[field.key];
                  return (
                    <div key={field.key} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label
                          htmlFor={`scene-${scene.scene}-${field.key}`}
                          className="text-[11px]"
                        >
                          {field.label}
                        </Label>
                        <Input
                          id={`scene-${scene.scene}-${field.key}`}
                          type="number"
                          min={0}
                          max={1}
                          step={0.001}
                          value={value}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            updateField(scene, {
                              [field.key]: Number.isFinite(next)
                                ? Math.min(1, Math.max(0, next))
                                : 0,
                            });
                          }}
                          className="h-7 w-20 text-right font-mono-ui text-[11px]"
                        />
                      </div>
                      <RangeSlider
                        min={0}
                        max={1}
                        step={0.001}
                        value={value}
                        onChange={(next) => updateField(scene, { [field.key]: next })}
                        className="mt-2 w-full"
                        aria-label={`${scene.sceneLabel}${field.label}权重`}
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">{field.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateField(scene, normalizeWeights(current))
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  归一化
                </Button>
                <span className={sceneValid ? "text-[11px] text-muted-foreground" : "text-[11px] text-destructive"}>
                  当前总和 {sum.toFixed(3)}
                  {scene.seedRequired ? " · 需要种子商品" : ""}
                  {scene.maxPerCategory > 0 ? ` · 每类最多 ${scene.maxPerCategory} 件` : ""}
                </span>
              </div>
              {!sceneValid ? (
                <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/[0.04] px-3 py-2 text-[11px] text-destructive">
                  该场景权重之和需要等于 1，可点击「归一化」自动调整。
                </p>
              ) : null}
              {scene.updatedAt ? (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  最近更新 {formatDateTime(scene.updatedAt)}
                  {scene.updatedBy ? ` · 操作人 #${scene.updatedBy}` : ""}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() =>
            mutation.mutate({
              scenes: scenes.map((scene) => {
                const current = currentFor(scene);
                return {
                  scene: scene.scene,
                  contentWeight: current.contentWeight,
                  popularityWeight: current.popularityWeight,
                  festivalWeight: current.festivalWeight,
                  ratingWeight: current.ratingWeight,
                  enabled: current.enabled,
                };
              }),
            })
          }
          loading={mutation.isPending}
          disabled={!valid || !dirty}
        >
          <Save className="h-3.5 w-3.5" />
          保存全部场景
        </Button>
      </div>
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
  const valid = weightsValid(current);
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
                <RangeSlider
                  min={0}
                  max={1}
                  step={0.001}
                  value={value}
                  onChange={(next) => {
                    setWeights((previous) => ({
                      ...(previous ?? current),
                      [field.key]: next,
                    }));
                  }}
                  className="mt-2 w-full"
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

function EffectsSection() {
  const [days, setDays] = useState("30");
  const effects = useQuery({
    queryKey: queryKeys.adminRecommendationEffects(Number(days)),
    queryFn: () => recommendationOpsService.effects(Number(days)),
    staleTime: 30_000,
  });

  const data = effects.data;
  const daily = useMemo(
    () => [...(data?.daily ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
    [data?.daily],
  );

  if (effects.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (effects.isError) {
    return <ErrorState onRetry={() => effects.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <section className="ui-card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">推荐曝光效果</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              统计推荐曝光、点击、加购与下单归因，窗口 {data?.startDate ?? "-"} 至 {data?.endDate ?? "-"}。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CustomSelect
              id="effect-days"
              value={days}
              onChange={setDays}
              options={effectDayOptions}
              className="w-32"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => effects.refetch()}
              loading={effects.isFetching}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <EvalStat icon={Activity} label="曝光" value={formatNumber(data?.impressions)} />
          <EvalStat icon={MousePointerClick} label="点击" value={formatNumber(data?.clicks)} />
          <EvalStat icon={Sparkles} label="加购" value={formatNumber(data?.addToCarts)} />
          <EvalStat icon={Target} label="下单" value={formatNumber(data?.orders)} />
          <EvalStat icon={BarChart3} label="点击率 CTR" value={formatPercent(data?.ctr)} />
          <EvalStat icon={WandSparkles} label="转化率 CVR" value={formatPercent(data?.cvr)} />
          <EvalStat icon={Layers} label="加购率" value={formatPercent(data?.addToCartRate)} />
          <EvalStat icon={TrendingUp} label="下单率" value={formatPercent(data?.orderRate)} />
        </div>
      </section>

      <section className="ui-card overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">按场景</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">识别不同推荐位对点击与转化的贡献。</p>
        </div>
        {Object.keys(data?.byScene ?? {}).length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">当前窗口暂无场景曝光数据。</p>
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>场景</TH>
                  <TH className="text-right">曝光</TH>
                  <TH className="text-right">点击</TH>
                  <TH className="text-right">加购</TH>
                  <TH className="text-right">下单</TH>
                  <TH className="text-right">CTR</TH>
                  <TH className="text-right">CVR</TH>
                </TR>
              </THead>
              <TBody>
                {Object.entries(data?.byScene ?? {}).map(([scene, item]) => (
                  <TR key={scene}>
                    <TD className="font-medium">{sceneLabels[scene] ?? scene}</TD>
                    <TD className="text-right tabular">{formatNumber(item.impressions)}</TD>
                    <TD className="text-right tabular">{formatNumber(item.clicks)}</TD>
                    <TD className="text-right tabular">{formatNumber(item.addToCarts)}</TD>
                    <TD className="text-right tabular">{formatNumber(item.orders)}</TD>
                    <TD className="text-right tabular">{formatPercent(item.ctr)}</TD>
                    <TD className="text-right tabular">{formatPercent(item.cvr)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </section>

      <section className="ui-card overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">实验变体</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">对照组与实验组的曝光和转化对比。</p>
        </div>
        {(data?.byVariant ?? []).length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">当前窗口暂无实验分流数据。</p>
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>实验</TH>
                  <TH>变体</TH>
                  <TH className="text-right">曝光</TH>
                  <TH className="text-right">点击</TH>
                  <TH className="text-right">下单</TH>
                  <TH className="text-right">CTR</TH>
                  <TH className="text-right">CVR</TH>
                </TR>
              </THead>
              <TBody>
                {(data?.byVariant ?? []).map((item) => (
                  <TR key={`${item.experimentId}-${item.variant}`}>
                    <TD className="font-medium">{item.experimentId || "默认策略"}</TD>
                    <TD>
                      <Badge variant={item.variant === "TREATMENT" ? "default" : "secondary"}>
                        {variantLabel(item.variant)}
                      </Badge>
                    </TD>
                    <TD className="text-right tabular">{formatNumber(item.impressions)}</TD>
                    <TD className="text-right tabular">{formatNumber(item.clicks)}</TD>
                    <TD className="text-right tabular">{formatNumber(item.orders)}</TD>
                    <TD className="text-right tabular">{formatPercent(item.ctr)}</TD>
                    <TD className="text-right tabular">{formatPercent(item.cvr)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </section>

      <section className="ui-card overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">按天趋势</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">最近 14 天的推荐效果变化。</p>
        </div>
        {daily.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">当前窗口暂无按天数据。</p>
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>日期</TH>
                  <TH className="text-right">曝光</TH>
                  <TH className="text-right">点击</TH>
                  <TH className="text-right">下单</TH>
                  <TH className="text-right">CTR</TH>
                  <TH className="text-right">CVR</TH>
                </TR>
              </THead>
              <TBody>
                {daily.map((item) => (
                  <TR key={item.date}>
                    <TD className="font-medium">{item.date}</TD>
                    <TD className="text-right tabular">{formatNumber(item.impressions)}</TD>
                    <TD className="text-right tabular">{formatNumber(item.clicks)}</TD>
                    <TD className="text-right tabular">{formatNumber(item.orders)}</TD>
                    <TD className="text-right tabular">{formatPercent(item.ctr)}</TD>
                    <TD className="text-right tabular">{formatPercent(item.cvr)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </section>
    </div>
  );
}

function ExperimentsSection() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecommendationExperimentVO | null>(null);
  const [form, setForm] = useState<RecommendationExperimentRequest>({ ...emptyExperiment });

  const experiments = useQuery({
    queryKey: queryKeys.adminRecommendationExperiments,
    queryFn: recommendationOpsService.experiments,
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminRecommendationExperiments });
    void queryClient.invalidateQueries({ queryKey: ["admin", "recommendation-effects"] });
  };

  const save = useMutation({
    mutationFn: recommendationOpsService.saveExperiment,
    onSuccess: () => {
      toast.success("实验已保存");
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyExperiment });
      invalidate();
    },
    onError: (error) => toast.error("保存实验失败", getErrorMessage(error)),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      recommendationOpsService.updateExperimentStatus(id, status),
    onSuccess: () => {
      toast.success("实验状态已更新");
      invalidate();
    },
    onError: (error) => toast.error("更新实验状态失败", getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyExperiment });
    setOpen(true);
  };

  const openEdit = (experiment: RecommendationExperimentVO) => {
    setEditing(experiment);
    setForm({
      id: experiment.id,
      name: experiment.name,
      scene: experiment.scene,
      mode: experiment.mode,
      trafficPercent: experiment.trafficPercent,
      status: experiment.status,
      primaryMetric: experiment.primaryMetric,
      configJson: experiment.configJson ?? "",
    });
    setOpen(true);
  };

  const handleSave = () => {
    const id = form.id.trim();
    const name = form.name.trim();
    const trafficPercent = Number(form.trafficPercent);
    if (!id || !name) {
      toast.error("请填写实验 ID 和名称");
      return;
    }
    if (!Number.isFinite(trafficPercent) || trafficPercent < 0 || trafficPercent > 100) {
      toast.error("流量比例需在 0 到 100 之间");
      return;
    }
    const configJson = form.configJson?.trim();
    if (configJson) {
      try {
        JSON.parse(configJson);
      } catch {
        toast.error("配置 JSON 格式不正确");
        return;
      }
    }
    save.mutate({
      ...form,
      id,
      name,
      trafficPercent,
      configJson: configJson || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <section className="ui-card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">推荐实验</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              管理 A/B 与影子实验，控制流量比例、主指标和运行状态；效果数据在“曝光效果”中查看。
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            新建实验
          </Button>
        </div>
      </section>

      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" />
            共 {experiments.data?.length ?? 0} 个实验
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => experiments.refetch()}
            loading={experiments.isFetching}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
        </div>

        {experiments.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : experiments.isError ? (
          <div className="p-4">
            <ErrorState onRetry={() => experiments.refetch()} />
          </div>
        ) : (experiments.data?.length ?? 0) === 0 ? (
          <EmptyState
            bare
            title="还没有推荐实验"
            description="创建一个 A/B 或影子实验，观察不同推荐策略的点击与转化表现。"
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                新建实验
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>实验</TH>
                  <TH>场景</TH>
                  <TH>模式</TH>
                  <TH className="text-right">流量</TH>
                  <TH>状态</TH>
                  <TH>主指标</TH>
                  <TH>更新时间</TH>
                  <TH className="text-right">操作</TH>
                </TR>
              </THead>
              <TBody>
                {(experiments.data ?? []).map((experiment) => (
                  <TR key={experiment.id}>
                    <TD>
                      <p className="font-medium">{experiment.name}</p>
                      <p className="text-[10px] text-muted-foreground">{experiment.id}</p>
                    </TD>
                    <TD>{sceneLabels[experiment.scene] ?? experiment.scene}</TD>
                    <TD>{experiment.mode === "SHADOW" ? "影子" : "A/B"}</TD>
                    <TD className="text-right tabular">{experiment.trafficPercent}%</TD>
                    <TD>
                      <Badge variant={experimentStatusVariant(experiment.status)}>
                        {experimentStatusLabel(experiment.status)}
                      </Badge>
                    </TD>
                    <TD>{experiment.primaryMetric}</TD>
                    <TD className="text-[11px] text-muted-foreground">
                      {formatDateTime(experiment.updatedAt)}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(experiment)}
                          disabled={updateStatus.isPending}
                        >
                          编辑
                        </Button>
                        {experiment.status === "RUNNING" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: experiment.id, status: "PAUSED" })}
                            disabled={updateStatus.isPending}
                          >
                            <Pause className="h-3 w-3" />
                            暂停
                          </Button>
                        ) : experiment.status !== "STOPPED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus.mutate({ id: experiment.id, status: "RUNNING" })}
                            disabled={updateStatus.isPending}
                          >
                            <Play className="h-3 w-3" />
                            启动
                          </Button>
                        ) : null}
                        {experiment.status !== "STOPPED" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => updateStatus.mutate({ id: experiment.id, status: "STOPPED" })}
                            disabled={updateStatus.isPending}
                          >
                            <Square className="h-3 w-3" />
                            停止
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </section>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditing(null);
            setForm({ ...emptyExperiment });
          }
        }}
        title={editing ? "编辑推荐实验" : "新建推荐实验"}
        description="实验 ID 用于归因与事件去重；保存后可通过状态按钮启动或暂停。"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} loading={save.isPending}>
              <Save className="h-4 w-4" />
              保存实验
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="experiment-id">实验 ID</Label>
              <Input
                id="experiment-id"
                value={form.id}
                onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                placeholder="home_ab_2026q4"
                disabled={Boolean(editing)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experiment-name">实验名称</Label>
              <Input
                id="experiment-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="首页推荐 A/B 实验"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="experiment-scene">推荐场景</Label>
              <CustomSelect
                id="experiment-scene"
                value={form.scene}
                onChange={(value) => setForm((prev) => ({ ...prev, scene: value }))}
                options={experimentSceneOptions}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experiment-mode">实验模式</Label>
              <CustomSelect
                id="experiment-mode"
                value={form.mode}
                onChange={(value) => setForm((prev) => ({ ...prev, mode: value }))}
                options={experimentModeOptions}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="experiment-traffic">流量比例（%）</Label>
              <Input
                id="experiment-traffic"
                type="number"
                min={0}
                max={100}
                value={form.trafficPercent}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, trafficPercent: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experiment-status">状态</Label>
              <CustomSelect
                id="experiment-status"
                value={form.status}
                onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                options={experimentStatusOptions}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experiment-metric">主指标</Label>
              <CustomSelect
                id="experiment-metric"
                value={form.primaryMetric}
                onChange={(value) => setForm((prev) => ({ ...prev, primaryMetric: value }))}
                options={experimentMetricOptions}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="experiment-config">配置 JSON（可选）</Label>
            <Textarea
              id="experiment-config"
              value={form.configJson ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, configJson: event.target.value }))}
              rows={6}
              placeholder='{"treatmentStrategy":"VECTOR_HYBRID","controlStrategy":"CONTENT_TFIDF_MULTI_FACTOR"}'
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              留空时后端使用默认策略；保存前会校验 JSON 格式。
            </p>
          </div>
        </div>
      </Dialog>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const keywordParam = searchParams.get("keyword") ?? "";
  const [draft, setDraft] = useState({
    keyword: keywordParam,
    start: "",
    end: "",
  });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(LOG_PAGE_SIZE);
  const [detail, setDetail] = useState<RecommendationLogVO | null>(null);

  const syncKeywordParam = (keyword: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        const trimmed = keyword.trim();
        if (trimmed) next.set("keyword", trimmed);
        else next.delete("keyword");
        return next;
      },
      { replace: true },
    );
  };

  const applyKeyword = (keyword: string) => {
    setDraft((current) => ({ ...current, keyword }));
    setFilters((current) => ({ ...current, keyword }));
    setPage(1);
    syncKeywordParam(keyword);
  };

  useEffect(() => {
    setDraft((current) => ({ ...current, keyword: keywordParam }));
    setFilters((current) => ({ ...current, keyword: keywordParam }));
    setPage(1);
  }, [keywordParam]);

  const params = useMemo<RecommendationLogQuery>(() => {
    const query: RecommendationLogQuery = { page, size: pageSize };
    if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
    if (filters.start) query.start = `${filters.start}T00:00:00`;
    if (filters.end) query.end = `${filters.end}T23:59:59`;
    return query;
  }, [page, pageSize, filters]);

  const query = useQuery({
    queryKey: queryKeys.adminRecommendationLogs(params),
    queryFn: () => adminService.recommendationLogs(params),
    placeholderData: (previous) => previous,
  });

  const activeFilters = [filters.keyword, filters.start, filters.end].filter(Boolean).length;
  const records = query.data?.records ?? [];

  return (
    <div className="space-y-4">
      <div className="ui-card p-4">
        <form
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-12"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters(draft);
            setPage(1);
            syncKeywordParam(draft.keyword);
          }}
        >
          <div className="xl:col-span-4">
            <Label htmlFor="log-keyword" className="sr-only">
              搜索推荐日志
            </Label>
            <Input
              id="log-keyword"
              value={draft.keyword}
              onChange={(event) =>
                setDraft((current) => ({ ...current, keyword: event.target.value }))
              }
              placeholder="用户昵称、场景、季节或节日"
              className="h-9 text-xs"
            />
          </div>
          <div className="xl:col-span-3">
            <Label htmlFor="log-start" className="sr-only">
              开始日期
            </Label>
            <DatePicker
              id="log-start"
              value={draft.start}
              onChange={(next) => setDraft((current) => ({ ...current, start: next }))}
              placeholder="开始日期"
              className="h-9 text-xs"
              aria-label="开始日期"
            />
          </div>
          <div className="xl:col-span-3">
            <Label htmlFor="log-end" className="sr-only">
              结束日期
            </Label>
            <DatePicker
              id="log-end"
              value={draft.end}
              onChange={(next) => setDraft((current) => ({ ...current, end: next }))}
              placeholder="结束日期"
              className="h-9 text-xs"
              aria-label="结束日期"
            />
          </div>
          <div className="flex gap-2 xl:col-span-2">
            <Button type="submit" className="h-9 w-full px-6 sm:w-auto">
              筛选
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 shrink-0 px-4"
              onClick={() => {
                const empty = { keyword: "", start: "", end: "" };
                setDraft(empty);
                setFilters(empty);
                setPage(1);
                syncKeywordParam("");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
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
                ? "试试清除筛选条件，或换一个用户昵称、场景、季节、节日或时间范围。"
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
                          <div className="flex min-w-0 flex-col">
                            {log.userNickname ? (
                              <Link
                                to={`/admin/recommendations?keyword=${encodeURIComponent(log.userNickname)}`}
                                onClick={() => applyKeyword(log.userNickname ?? "")}
                                className="truncate text-primary hover:underline"
                              >
                                {log.userNickname}
                              </Link>
                            ) : (
                              <span className="truncate">用户 #{log.userId}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground tabular">
                              #{log.userId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">匿名</span>
                        )}
                      </TD>
                      <TD>
                        <Badge variant="outline">{log.sceneLabel || log.scene || "默认场景"}</Badge>
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {log.seasonLabel || log.season}
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
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS.standard}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
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
            ? `${formatDateTime(detail.createdAt)} · ${
                detail.sceneLabel || detail.scene || "默认场景"
              } · ${detail.coldStart ? "冷启动" : "常规推荐"}`
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
                <dd className="mt-0.5">
                  {detail.userNickname || (detail.userId ? `用户 #${detail.userId}` : "匿名")}
                  {detail.userNickname && detail.userId ? (
                    <span className="ml-1 text-[10px] text-muted-foreground tabular">
                      #{detail.userId}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">场景</dt>
                <dd className="mt-0.5">{detail.sceneLabel || detail.scene || "默认场景"}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">季节</dt>
                <dd className="mt-0.5">{detail.seasonLabel || detail.season}</dd>
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
