import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Gauge,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { adminService, aiService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatPercent } from "@/lib/format";
import { toast } from "@/stores/toast";
import type {
  AiProductCopyVO,
  AiWeightAdviceVO,
  ProductVO,
  RecommendationSceneWeightVO,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomSelect } from "@/components/ui/custom-select";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const TONE_OPTIONS = [
  { value: "温暖", label: "温暖治愈" },
  { value: "简洁", label: "简洁直接" },
  { value: "文艺", label: "文艺清新" },
  { value: "活泼", label: "活泼轻快" },
];

const LENGTH_OPTIONS = [
  { value: "short", label: "短文案" },
  { value: "medium", label: "标准" },
  { value: "long", label: "长文案" },
];

const WEIGHT_LABELS: Array<[string, string]> = [
  ["content", "内容相似度"],
  ["popularity", "销量热度"],
  ["festival", "节日季节"],
  ["rating", "评分表现"],
];

interface CopyForm {
  name: string;
  category: string;
  grade: string;
  origin: string;
  flowerMeaning: string;
  occasionTags: string;
  festivalTags: string;
  description: string;
  price: string;
}

interface CopyDraft {
  title: string;
  description: string;
  tags: string[];
  sellingPoints: string[];
}

interface ApplyFlags {
  title: boolean;
  description: boolean;
  tags: boolean;
  sellingPoints: boolean;
}

const EMPTY_COPY_FORM: CopyForm = {
  name: "",
  category: "",
  grade: "",
  origin: "",
  flowerMeaning: "",
  occasionTags: "",
  festivalTags: "",
  description: "",
  price: "",
};

const EMPTY_APPLY_FLAGS: ApplyFlags = {
  title: true,
  description: true,
  tags: true,
  sellingPoints: true,
};

export function AdminMerchantAiPage() {
  const [tab, setTab] = useState("copy");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">商家 AI 助手</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          生成商品标题、描述、标签与卖点，也可获取推荐权重调参草稿，并人工确认后回写。
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="copy">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              商品文案
            </span>
          </TabsTrigger>
          <TabsTrigger value="advice">
            <span className="inline-flex items-center gap-1.5">
              <WandSparkles className="h-3.5 w-3.5" />
              推荐调参
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copy" className="mt-4">
          <CopySection />
        </TabsContent>
        <TabsContent value="advice" className="mt-4">
          <AdviceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CopySection() {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [form, setForm] = useState<CopyForm>({ ...EMPTY_COPY_FORM });
  const [tone, setTone] = useState("温暖");
  const [length, setLength] = useState("medium");
  const [draft, setDraft] = useState<CopyDraft | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();
  const [flags, setFlags] = useState<ApplyFlags>({ ...EMPTY_APPLY_FLAGS });

  const products = useQuery({
    queryKey: queryKeys.adminProducts({ page: 1, size: 200 }),
    queryFn: () => adminService.products({ page: 1, size: 200 }),
    staleTime: 60_000,
  });

  const productRecords = useMemo(() => products.data?.records ?? [], [products.data?.records]);
  const productOptions = useMemo(
    () =>
      productRecords.map((product: ProductVO) => ({
        value: String(product.id),
        label: `${product.name} · ${product.category}`,
      })),
    [productRecords],
  );

  const selectProduct = (value: string) => {
    setProductId(value);
    if (!value) {
      return;
    }
    const product = productRecords.find((item) => String(item.id) === value);
    if (!product) {
      return;
    }
    setForm({
      name: product.name,
      category: product.category,
      grade: "",
      origin: "",
      flowerMeaning: product.flowerMeaning ?? "",
      occasionTags: product.occasionTags ?? "",
      festivalTags: product.festivalTags ?? "",
      description: product.description ?? "",
      price: String(product.price),
    });
  };

  const generate = useMutation({
    mutationFn: () =>
      aiService.productCopy({
        productId: productId ? Number(productId) : undefined,
        name: form.name.trim() || undefined,
        category: form.category.trim() || undefined,
        grade: form.grade.trim() || undefined,
        origin: form.origin.trim() || undefined,
        flowerMeaning: form.flowerMeaning.trim() || undefined,
        occasionTags: form.occasionTags.trim() || undefined,
        festivalTags: form.festivalTags.trim() || undefined,
        description: form.description.trim() || undefined,
        price: form.price ? Number(form.price) : undefined,
        tone,
        length,
      }),
    onSuccess: (data: AiProductCopyVO) => {
      setDraft({
        title: data.title,
        description: data.description,
        tags: data.tags,
        sellingPoints: data.sellingPoints,
      });
      setDegraded(data.degraded);
      setFallbackReason(data.fallbackReason);
      setFlags({ ...EMPTY_APPLY_FLAGS });
      toast.success(
        data.degraded ? "已生成模板文案" : "AI 文案已生成",
        "确认内容后勾选要回写的字段。",
      );
    },
    onError: (error) => toast.error("文案生成失败", getErrorMessage(error)),
  });

  const apply = useMutation({
    mutationFn: () =>
      aiService.applyProductCopy({
        productId: Number(productId),
        title: draft?.title ?? "",
        description: draft?.description ?? "",
        tags: draft?.tags ?? [],
        sellingPoints: draft?.sellingPoints ?? [],
        applyTitle: flags.title,
        applyDescription: flags.description,
        applyTags: flags.tags,
        applySellingPoints: flags.sellingPoints,
      }),
    onSuccess: (product) => {
      toast.success("已回写商品", `「${product.name}」的文案与标签已更新。`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (error) => toast.error("回写失败", getErrorMessage(error)),
  });

  const selectedFields = Object.entries(flags).filter(([, value]) => value);
  const draftReady =
    Boolean(draft) &&
    (!flags.title || Boolean(draft?.title.trim())) &&
    (!flags.description || Boolean(draft?.description.trim())) &&
    (!flags.tags || Boolean(draft?.tags.length)) &&
    (!flags.sellingPoints || Boolean(draft?.sellingPoints.length));
  const canApply = Boolean(productId) && selectedFields.length > 0 && draftReady;
  const canGenerate = Boolean(productId) || Boolean(form.name.trim());

  const updateDraft = (patch: Partial<CopyDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制");
    } catch {
      toast.error("复制失败", "浏览器没有授予剪贴板权限。");
    }
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[420px_1fr]">
      <section className="ui-card p-4 md:p-5">
        <h2 className="text-sm font-semibold tracking-tight">商品信息</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          可关联已有商品自动带入，也可以只填名称，为新品生成文案。
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="merchant-copy-product">关联商品（可选）</Label>
            <CustomSelect
              id="merchant-copy-product"
              value={productId}
              onChange={selectProduct}
              options={productOptions}
              placeholder={products.isLoading ? "加载商品中…" : "不关联商品"}
              searchable
              searchPlaceholder="搜索商品"
              disabled={products.isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merchant-copy-name">商品名称</Label>
            <Input
              id="merchant-copy-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              maxLength={100}
              placeholder="例如：春日郁金香花束"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-category">品类</Label>
              <Input
                id="merchant-copy-category"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                maxLength={30}
                placeholder="例如：花束"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-grade">花材等级</Label>
              <Input
                id="merchant-copy-grade"
                value={form.grade}
                onChange={(event) =>
                  setForm((current) => ({ ...current, grade: event.target.value }))
                }
                maxLength={30}
                placeholder="例如：A 级"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-origin">产地</Label>
              <Input
                id="merchant-copy-origin"
                value={form.origin}
                onChange={(event) =>
                  setForm((current) => ({ ...current, origin: event.target.value }))
                }
                maxLength={60}
                placeholder="例如：云南昆明"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-price">价格</Label>
              <Input
                id="merchant-copy-price"
                type="number"
                min={0.01}
                step={0.01}
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({ ...current, price: event.target.value }))
                }
                placeholder="例如：199"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merchant-copy-meaning">花语</Label>
            <Input
              id="merchant-copy-meaning"
              value={form.flowerMeaning}
              onChange={(event) =>
                setForm((current) => ({ ...current, flowerMeaning: event.target.value }))
              }
              maxLength={200}
              placeholder="例如：热烈的爱与祝福"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-occasion">场景标签</Label>
              <Input
                id="merchant-copy-occasion"
                value={form.occasionTags}
                onChange={(event) =>
                  setForm((current) => ({ ...current, occasionTags: event.target.value }))
                }
                maxLength={200}
                placeholder="表白,纪念日"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-festival">节日标签</Label>
              <Input
                id="merchant-copy-festival"
                value={form.festivalTags}
                onChange={(event) =>
                  setForm((current) => ({ ...current, festivalTags: event.target.value }))
                }
                maxLength={200}
                placeholder="情人节,母亲节"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merchant-copy-description">现有描述</Label>
            <Textarea
              id="merchant-copy-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={3}
              maxLength={2000}
              placeholder="可留空，AI 会根据名称与花语生成"
              className="text-xs"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-tone">语气</Label>
              <CustomSelect
                id="merchant-copy-tone"
                value={tone}
                onChange={setTone}
                options={TONE_OPTIONS}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="merchant-copy-length">篇幅</Label>
              <CustomSelect
                id="merchant-copy-length"
                value={length}
                onChange={setLength}
                options={LENGTH_OPTIONS}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => generate.mutate()}
            loading={generate.isPending}
            disabled={!canGenerate}
          >
            <Sparkles className="h-4 w-4" />
            生成文案
          </Button>
          {products.isError ? (
            <p className="text-[11px] text-destructive">{getErrorMessage(products.error)}</p>
          ) : null}
        </div>
      </section>

      <section className="ui-card min-h-80 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">生成结果</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              标题与描述可直接微调，勾选需要回写的字段后再应用。
            </p>
          </div>
          {draft ? (
            <Badge variant={degraded ? "warning" : "success"}>
              {degraded ? "降级模板" : "AI 生成"}
            </Badge>
          ) : null}
        </div>
        {!draft ? (
          <EmptyState
            className="mt-6"
            icon={Sparkles}
            title="还没有生成文案"
            description="选择商品或填写名称，生成结果会显示在这里。"
          />
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="merchant-copy-result-title">标题</Label>
                  <Input
                    id="merchant-copy-result-title"
                    value={draft.title}
                    onChange={(event) => updateDraft({ title: event.target.value })}
                    maxLength={100}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="复制标题"
                  onClick={() => void copy(draft.title)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="merchant-copy-result-description">描述</Label>
                <Textarea
                  id="merchant-copy-result-description"
                  value={draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  rows={4}
                  maxLength={2000}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold">标签</h3>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="复制标签"
                    onClick={() => void copy(draft.tags.join("、"))}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draft.tags.length > 0 ? (
                    draft.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted-foreground">暂无标签</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold">卖点</h3>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="复制卖点"
                    onClick={() => void copy(draft.sellingPoints.join("\n"))}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {draft.sellingPoints.length > 0 ? (
                    draft.sellingPoints.map((point) => (
                      <li key={point} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        {point}
                      </li>
                    ))
                  ) : (
                    <li>暂无卖点</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3">
              <h3 className="text-xs font-semibold">回写字段</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <ApplyField
                  id="apply-title"
                  label="标题"
                  checked={flags.title}
                  onChange={(checked) => setFlags((current) => ({ ...current, title: checked }))}
                />
                <ApplyField
                  id="apply-description"
                  label="描述"
                  checked={flags.description}
                  onChange={(checked) =>
                    setFlags((current) => ({ ...current, description: checked }))
                  }
                />
                <ApplyField
                  id="apply-tags"
                  label="智能标签"
                  checked={flags.tags}
                  onChange={(checked) => setFlags((current) => ({ ...current, tags: checked }))}
                />
                <ApplyField
                  id="apply-selling-points"
                  label="卖点"
                  checked={flags.sellingPoints}
                  onChange={(checked) =>
                    setFlags((current) => ({ ...current, sellingPoints: checked }))
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={() => apply.mutate()} loading={apply.isPending} disabled={!canApply}>
                  <ClipboardCheck className="h-4 w-4" />
                  应用到商品
                </Button>
                {!productId ? (
                  <p className="text-[11px] text-muted-foreground">
                    选择一个已有商品后才能回写。
                  </p>
                ) : !draftReady ? (
                  <p className="text-[11px] text-muted-foreground">
                    选中的字段需要先生成内容。
                  </p>
                ) : null}
              </div>
            </div>

            {fallbackReason ? (
              <p className="rounded-md border border-warning/30 bg-warning/[0.06] px-3 py-2 text-[11px] text-warning">
                {fallbackReason}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function ApplyField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-xs text-muted-foreground">
      <Checkbox id={id} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function AdviceSection() {
  const queryClient = useQueryClient();
  const [scene, setScene] = useState("");
  const [days, setDays] = useState("30");
  const [result, setResult] = useState<AiWeightAdviceVO | null>(null);
  const [weights, setWeights] = useState<Record<string, number> | null>(null);

  const scenes = useQuery({
    queryKey: queryKeys.adminRecommendationSceneWeights,
    queryFn: adminService.sceneWeights,
    staleTime: 60_000,
  });

  const sceneOptions = useMemo(
    () =>
      (scenes.data ?? []).map((item: RecommendationSceneWeightVO) => ({
        value: item.scene,
        label: item.sceneLabel,
      })),
    [scenes.data],
  );

  const generate = useMutation({
    mutationFn: () =>
      aiService.recommendationAdvice({
        scene,
        days: Number(days) || 30,
      }),
    onSuccess: (data: AiWeightAdviceVO) => {
      setResult(data);
      setWeights({ ...data.suggestedWeights });
      toast.success(
        data.degraded ? "已生成启发式草稿" : "调参建议已生成",
        "请人工确认权重后应用。",
      );
    },
    onError: (error) => toast.error("调参建议生成失败", getErrorMessage(error)),
  });

  const apply = useMutation({
    mutationFn: () =>
      aiService.applyRecommendationAdvice({
        scene: result?.scene ?? scene,
        weights: weights ?? {},
      }),
    onSuccess: () => {
      toast.success("推荐权重已更新", "新的场景权重已生效。");
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminRecommendationSceneWeights });
    },
    onError: (error) => toast.error("权重应用失败", getErrorMessage(error)),
  });

  const weightTotal = weights
    ? Object.values(weights).reduce((sum, value) => sum + value, 0)
    : 0;
  const canApply = Boolean(result) && Boolean(weights) && weightTotal > 0;

  const updateWeight = (key: string, raw: string) => {
    const value = Number(raw);
    setWeights((current) => ({
      ...(current ?? {}),
      [key]: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0,
    }));
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[420px_1fr]">
      <section className="ui-card p-4 md:p-5">
        <h2 className="text-sm font-semibold tracking-tight">推荐权重调参建议</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          AI 会基于当前场景权重和观察窗口给出保守调整建议，应用前可手动微调。
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="merchant-advice-scene">推荐场景</Label>
            <CustomSelect
              id="merchant-advice-scene"
              value={scene}
              onChange={setScene}
              options={sceneOptions}
              placeholder={scenes.isLoading ? "加载场景中…" : "选择场景"}
              disabled={scenes.isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merchant-advice-days">观察窗口（天）</Label>
            <Input
              id="merchant-advice-days"
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={() => generate.mutate()}
            loading={generate.isPending}
            disabled={!scene}
          >
            <WandSparkles className="h-4 w-4" />
            生成建议
          </Button>
          {scenes.isError ? (
            <p className="text-[11px] text-destructive">{getErrorMessage(scenes.error)}</p>
          ) : null}
          <p className="rounded-md bg-muted/60 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            建议先小流量观察 3-7 天，确认 CTR、加购率与降级率没有明显恶化后再应用。
          </p>
        </div>
      </section>

      <section className="ui-card min-h-80 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">建议草稿</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              四项权重会自动归一化，应用后立即覆盖该场景配置。
            </p>
          </div>
          {result ? (
            <Badge variant={result.degraded ? "warning" : "success"}>
              置信度 {formatPercent(result.confidence)}
            </Badge>
          ) : null}
        </div>
        {!result || !weights ? (
          <EmptyState
            className="mt-6"
            icon={WandSparkles}
            title="还没有调参建议"
            description="选择场景与观察窗口后生成草稿。"
          />
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">{result.reason}</p>
              {result.fallbackReason ? (
                <p className="mt-2 text-[10px] text-warning">{result.fallbackReason}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              {WEIGHT_LABELS.map(([key, label]) => {
                const current = result.currentWeights[key] ?? 0;
                const suggested = weights[key] ?? 0;
                return (
                  <div key={key} className="rounded-lg border border-border/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium">{label}</span>
                      <span className="text-[11px] text-muted-foreground tabular">
                        当前 {formatPercent(current)} → 建议 {formatPercent(suggested)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={current * 100} className="flex-1" />
                      <span className="w-12 text-right text-[10px] text-muted-foreground tabular">
                        {current.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={suggested * 100} className="flex-1" />
                      <Input
                        aria-label={`${label}建议权重`}
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={suggested}
                        onChange={(event) => updateWeight(key, event.target.value)}
                        className="h-8 w-24 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                权重合计 {weightTotal.toFixed(3)}，保存时按比例归一化。
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/recommendations">
                    <Gauge className="h-3.5 w-3.5" />
                    查看权重配置
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => apply.mutate()}
                  loading={apply.isPending}
                  disabled={!canApply}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  应用权重
                </Button>
              </div>
            </div>

            {result.guardrails.length > 0 ? (
              <div className="rounded-lg border border-border/60 p-3">
                <h3 className="text-xs font-semibold">注意事项</h3>
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  {result.guardrails.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
