import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  Database,
  Gauge,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { aiService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { toast } from "@/stores/toast";
import type {
  AiCallLogVO,
  AiKnowledgeDocument,
  KnowledgeDocumentRequest,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminPromptTagsSection } from "./admin-prompt-tags-section";

const EMPTY_FORM: KnowledgeDocumentRequest = {
  title: "",
  category: "",
  content: "",
  source: "",
  enabled: true,
};

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 24px rgb(15 23 42 / 0.08)",
};

function formatQps(value?: number) {
  return (value ?? 0).toFixed(2);
}

export function AdminAiPage() {
  const [tab, setTab] = useState("status");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AI 运营看板</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          监控 AI 服务健康、实时 QPS、延迟、Token 成本与降级分布，并维护问答知识库。
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="status">
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              运行状态
            </span>
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              知识库
            </span>
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" />
              快捷提问
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <StatusSection />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeSection />
        </TabsContent>
        <TabsContent value="prompts" className="mt-4">
          <AdminPromptTagsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusSection() {
  const queryClient = useQueryClient();
  const health = useQuery({
    queryKey: queryKeys.adminAiHealth,
    queryFn: aiService.adminHealth,
    staleTime: 30_000,
  });
  const metrics = useQuery({
    queryKey: queryKeys.adminAiMetrics(30),
    queryFn: () => aiService.adminMetrics(30),
    staleTime: 60_000,
  });
  const calls = useQuery({
    queryKey: queryKeys.adminAiCalls({ page: 1, size: 10 }),
    queryFn: () => aiService.adminCalls({ page: 1, size: 10 }),
    staleTime: 30_000,
  });

  const reindex = useMutation({
    mutationFn: aiService.adminReindex,
    onSuccess: (result) => {
      toast.success("索引重建完成", result.message);
      void queryClient.invalidateQueries({ queryKey: ["admin", "ai"] });
    },
    onError: (error) => toast.error("索引重建失败", getErrorMessage(error)),
  });

  const refresh = () => {
    void health.refetch();
    void metrics.refetch();
    void calls.refetch();
  };

  const healthData = health.data;
  const metricsData = metrics.data;
  const callRecords = calls.data?.records ?? [];
  const sceneEntries = Object.entries(metricsData?.callsByScene ?? {}).sort(
    (a, b) => b[1] - a[1],
  );
  const sceneCosts = Object.values(metricsData?.costByScene ?? {}).sort(
    (a, b) => b.cost - a.cost,
  );
  const degradedEntries = Object.entries(metricsData?.degradedStages ?? {}).sort(
    (a, b) => b[1] - a[1],
  );
  const endpointRows = metricsData?.endpoints ?? [];

  const dailyData = useMemo(
    () =>
      (metricsData?.daily ?? []).map((point) => ({
        ...point,
        label: point.date.slice(5),
      })),
    [metricsData?.daily],
  );
  const hourlyData = useMemo(
    () =>
      (metricsData?.hourly ?? []).map((point) => ({
        ...point,
        label: point.hour.slice(11, 16),
      })),
    [metricsData?.hourly],
  );

  const healthTone = !healthData?.reachable
    ? "danger"
    : healthData.degraded
      ? "warning"
      : "success";

  return (
    <div className="space-y-4">
      <section className="ui-card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">AI 服务连接</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              后端通过内部令牌访问 AI 服务，Nacos 开启时自动发现实例。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh} loading={health.isFetching}>
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </Button>
            <Button size="sm" onClick={() => reindex.mutate()} loading={reindex.isPending}>
              <Database className="h-3.5 w-3.5" />
              重建索引
            </Button>
          </div>
        </div>

        {health.isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : health.isError ? (
          <ErrorState
            className="mt-4"
            compact
            title="AI 健康状态没送到"
            description={getErrorMessage(health.error)}
            onRetry={() => void health.refetch()}
          />
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatTile
                icon={healthData?.reachable ? CheckCircle2 : XCircle}
                label="服务状态"
                value={healthData?.status || (healthData?.reachable ? "UP" : "DOWN")}
                tone={healthTone}
              />
              <StatTile
                icon={Database}
                label="Qdrant 向量库"
                value={healthData?.qdrantReady ? "就绪" : "未就绪"}
                tone={healthData?.qdrantReady ? "success" : "warning"}
              />
              <StatTile
                icon={Bot}
                label="LLM"
                value={healthData?.llmReady ? "已配置" : "未配置"}
                tone={healthData?.llmReady ? "success" : "warning"}
              />
              <StatTile
                icon={Sparkles}
                label="Embedding"
                value={healthData?.embeddingReady ? "已配置" : "未配置"}
                tone={healthData?.embeddingReady ? "success" : "warning"}
              />
              <StatTile
                icon={Gauge}
                label="实时 QPS"
                value={formatQps(metricsData?.qps)}
                tone={(metricsData?.qps ?? 0) > 0 ? "success" : undefined}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <Badge variant={healthData?.degraded ? "warning" : "success"}>
                {healthData?.degraded ? "降级运行" : "全部就绪"}
              </Badge>
              <span className="font-medium text-foreground">Endpoint：</span>
              {healthData?.endpoint || "-"}
              <span>·</span>
              {healthData?.message || "暂无状态说明"}
            </div>
          </>
        )}
      </section>

      <section className="ui-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">调用指标（30 天）</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              成功率、降级率、延迟与 token 成本均来自后端调用日志。
            </p>
          </div>
          {metricsData ? (
            <Badge variant={metricsData.fallbackRate > 0.2 ? "warning" : "success"}>
              降级率 {formatPercent(metricsData.fallbackRate)}
            </Badge>
          ) : null}
        </div>
        {metrics.isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : metrics.isError ? (
          <ErrorState
            className="mt-4"
            compact
            title="调用指标没送到"
            description={getErrorMessage(metrics.error)}
            onRetry={() => void metrics.refetch()}
          />
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile icon={Activity} label="总调用" value={formatNumber(metricsData?.totalCalls)} />
              <StatTile
                icon={CheckCircle2}
                label="成功率"
                value={formatPercent(metricsData?.successRate)}
                tone={(metricsData?.successRate ?? 0) >= 0.95 ? "success" : "warning"}
              />
              <StatTile
                icon={AlertTriangle}
                label="降级 / 失败"
                value={`${formatNumber(metricsData?.fallbackCalls)} / ${formatNumber(
                  metricsData?.failedCalls,
                )}`}
                tone={(metricsData?.failedCalls ?? 0) > 0 ? "danger" : undefined}
              />
              <StatTile
                icon={Gauge}
                label="实时 QPS"
                value={formatQps(metricsData?.qps)}
              />
              <StatTile
                icon={Gauge}
                label="5 分钟 P95"
                value={`${formatNumber(metricsData?.p95LatencyMs5m)} ms`}
              />
              <StatTile
                icon={Activity}
                label="5 分钟平均延迟"
                value={`${formatNumber(metricsData?.avgLatencyMs5m)} ms`}
              />
              <StatTile
                icon={Bot}
                label="首 token P95"
                value={`${formatNumber(metricsData?.firstTokenP95Ms)} ms`}
              />
              <StatTile
                icon={Gauge}
                label="30 天 P95"
                value={`${formatNumber(metricsData?.p95LatencyMs)} ms`}
              />
              <StatTile
                icon={Sparkles}
                label="Token（输入 / 输出）"
                value={`${formatNumber(metricsData?.promptTokens)} / ${formatNumber(
                  metricsData?.completionTokens,
                )}`}
              />
              <StatTile
                icon={Sparkles}
                label="Token 总量"
                value={formatNumber(metricsData?.totalTokens)}
              />
              <StatTile
                icon={Database}
                label="30 天估算成本"
                value={formatCurrency(metricsData?.estimatedCost)}
              />
              <StatTile
                icon={Database}
                label="今日 / 本月成本"
                value={`${formatCurrency(metricsData?.todayCost)} / ${formatCurrency(
                  metricsData?.monthCost,
                )}`}
              />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold">近 30 天调用与成本</h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      面积表示调用量，柱状表示降级，折线表示每日成本。
                    </p>
                  </div>
                  <Badge variant="outline">30 天</Badge>
                </div>
                <div className="mt-3 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyData}>
                      <defs>
                        <linearGradient id="aiCallsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={18}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        width={34}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        width={46}
                        tickFormatter={(value: number) => `¥${value}`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => {
                          if (name === "cost") return [formatCurrency(value), "成本"];
                          if (name === "fallback") return [formatNumber(value), "降级"];
                          return [formatNumber(value), "调用"];
                        }}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="calls"
                        name="calls"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#aiCallsFill)"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="fallback"
                        name="fallback"
                        fill="var(--warning)"
                        opacity={0.55}
                        radius={[3, 3, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cost"
                        name="cost"
                        stroke="var(--chart-2, #818cf8)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold">近 24 小时调用与延迟</h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      柱状为每小时调用量，折线为平均与 P95 延迟。
                    </p>
                  </div>
                  <Badge variant="outline">24 小时</Badge>
                </div>
                <div className="mt-3 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={hourlyData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={16}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        width={34}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        tickFormatter={(value: number) => `${value}ms`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => {
                          if (name === "avgLatencyMs") return [`${formatNumber(value)} ms`, "平均延迟"];
                          if (name === "p95LatencyMs") return [`${formatNumber(value)} ms`, "P95 延迟"];
                          if (name === "fallback") return [formatNumber(value), "降级"];
                          return [formatNumber(value), "调用"];
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="calls"
                        name="calls"
                        fill="var(--primary)"
                        opacity={0.35}
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="fallback"
                        name="fallback"
                        fill="var(--warning)"
                        opacity={0.6}
                        radius={[3, 3, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgLatencyMs"
                        name="avgLatencyMs"
                        stroke="var(--chart-2, #818cf8)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="p95LatencyMs"
                        name="p95LatencyMs"
                        stroke="var(--destructive)"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <div className="rounded-xl border border-border/60 p-3">
                <h3 className="text-xs font-semibold">按场景分布</h3>
                {sceneEntries.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {sceneEntries.map(([scene, count]) => {
                      const total = Math.max(1, metricsData?.totalCalls ?? 1);
                      return (
                        <div key={scene} className="flex items-center gap-3 text-[11px]">
                          <span className="w-32 shrink-0 truncate text-muted-foreground">
                            {scene}
                          </span>
                          <Progress value={(count / total) * 100} className="flex-1" />
                          <span className="w-12 text-right tabular">{formatNumber(count)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-muted-foreground">暂无场景调用记录。</p>
                )}
                {degradedEntries.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-xs font-semibold">降级阶段</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {degradedEntries.map(([stage, count]) => (
                        <Badge key={stage} variant="warning">
                          {stage} · {formatNumber(count)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border/60 p-3">
                <h3 className="text-xs font-semibold">按场景成本</h3>
                {sceneCosts.length > 0 ? (
                  <div className="mt-2 overflow-x-auto">
                    <Table>
                      <THead>
                        <TR>
                          <TH>场景</TH>
                          <TH className="text-right">调用</TH>
                          <TH className="text-right">Token</TH>
                          <TH className="text-right">成本</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {sceneCosts.map((item) => (
                          <TR key={item.scene}>
                            <TD className="py-2">
                              <Badge variant="outline">{item.scene}</Badge>
                            </TD>
                            <TD className="text-right text-[11px] tabular">
                              {formatNumber(item.calls)}
                            </TD>
                            <TD className="text-right text-[11px] tabular">
                              {formatNumber(item.totalTokens)}
                            </TD>
                            <TD className="text-right text-[11px] tabular">
                              {formatCurrency(item.cost)}
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-muted-foreground">暂无成本记录。</p>
                )}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                <div>
                  <h3 className="text-xs font-semibold">实时端点运行指标（5 分钟窗口）</h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    AOP 采集 AI 客户端调用，失败包含超时与服务异常。
                  </p>
                </div>
                <Badge variant="outline">{formatNumber(endpointRows.length)} 个端点</Badge>
              </div>
              {endpointRows.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="近 5 分钟还没有调用"
                  description="用户使用 AI 问答或商家生成文案后，这里会显示实时端点指标。"
                  bare
                />
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <TR>
                        <TH>端点</TH>
                        <TH className="text-right">调用</TH>
                        <TH className="text-right">失败</TH>
                        <TH className="text-right">QPS</TH>
                        <TH className="text-right">平均延迟</TH>
                        <TH className="text-right">P95</TH>
                        <TH>最近状态</TH>
                        <TH>最近调用</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {endpointRows.map((item) => (
                        <TR key={item.path}>
                          <TD className="max-w-72 truncate text-[11px]">{item.path}</TD>
                          <TD className="text-right text-[11px] tabular">
                            {formatNumber(item.calls)}
                          </TD>
                          <TD className="text-right text-[11px] tabular">
                            {formatNumber(item.failures)}
                          </TD>
                          <TD className="text-right text-[11px] tabular">{formatQps(item.qps)}</TD>
                          <TD className="text-right text-[11px] tabular">
                            {formatNumber(item.avgLatencyMs)} ms
                          </TD>
                          <TD className="text-right text-[11px] tabular">
                            {formatNumber(item.p95LatencyMs)} ms
                          </TD>
                          <TD>
                            <Badge
                              variant={item.lastStatus === "SUCCESS" ? "success" : "destructive"}
                            >
                              {item.lastStatus}
                            </Badge>
                          </TD>
                          <TD className="whitespace-nowrap text-[11px] text-muted-foreground tabular">
                            {formatDateTime(item.lastCalledAt)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </div>
          </>
        )}
      </section>

      <section className="ui-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">最近调用日志</h2>
          <Badge variant="outline">{formatNumber(calls.data?.total)} 条</Badge>
        </div>
        {calls.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : calls.isError ? (
          <ErrorState
            title="调用日志没送到"
            description={getErrorMessage(calls.error)}
            onRetry={() => void calls.refetch()}
          />
        ) : callRecords.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="还没有 AI 调用"
            description="用户使用 AI 问答或管理员生成文案后，调用日志会出现在这里。"
            bare
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>时间</TH>
                  <TH>场景</TH>
                  <TH>状态</TH>
                  <TH>模型</TH>
                  <TH>延迟</TH>
                  <TH>Token</TH>
                  <TH>成本</TH>
                </TR>
              </THead>
              <TBody>
                {callRecords.map((log: AiCallLogVO) => (
                  <TR key={log.id}>
                    <TD className="whitespace-nowrap py-3 text-[11px] text-muted-foreground tabular">
                      {formatDateTime(log.createdAt)}
                    </TD>
                    <TD>
                      <Badge variant="outline">{log.scene}</Badge>
                    </TD>
                    <TD>
                      <Badge
                        variant={
                          log.status === "SUCCESS"
                            ? "success"
                            : log.status === "FALLBACK"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
                    </TD>
                    <TD className="text-[11px] text-muted-foreground">{log.model}</TD>
                    <TD className="text-[11px] tabular">
                      {log.latencyMs ? `${log.latencyMs} ms` : "-"}
                    </TD>
                    <TD className="text-[11px] tabular">{formatNumber(log.totalTokens)}</TD>
                    <TD className="text-[11px] tabular">{formatCurrency(log.estimatedCost)}</TD>
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

function KnowledgeSection() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [queryKeyword, setQueryKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AiKnowledgeDocument | null>(null);
  const [form, setForm] = useState<KnowledgeDocumentRequest>({ ...EMPTY_FORM });
  const [deleting, setDeleting] = useState<AiKnowledgeDocument | null>(null);

  const query = useQuery({
    queryKey: queryKeys.adminAiKnowledge({ keyword: queryKeyword }),
    queryFn: () => aiService.adminKnowledge({ keyword: queryKeyword || undefined }),
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "ai", "knowledge"] });
  };

  const save = useMutation({
    mutationFn: () =>
      editing
        ? aiService.updateKnowledge(editing.id, form)
        : aiService.createKnowledge(form),
    onSuccess: () => {
      toast.success(editing ? "知识库文档已更新" : "知识库文档已新增", "AI 会在后续问答中使用新内容。");
      setOpen(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
      invalidate();
    },
    onError: (error) => toast.error("保存失败", getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => aiService.deleteKnowledge(id),
    onSuccess: () => {
      toast.success("知识库文档已删除");
      setDeleting(null);
      invalidate();
    },
    onError: (error) => toast.error("删除失败", getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  };

  const openEdit = (document: AiKnowledgeDocument) => {
    setEditing(document);
    setForm({
      title: document.title,
      category: document.category,
      content: document.content,
      source: document.source ?? "",
      enabled: document.enabled,
    });
    setOpen(true);
  };

  const records = query.data ?? [];

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-[11px] leading-relaxed text-warning">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          知识库是公开内容库：启用的文档会进入所有用户的 AI 问答上下文，并可能被用户复述。请勿填写成本、进价、供应商、毛利、
          内部 SOP、客户信息或密钥等内部资料。
        </span>
      </p>
      <section className="ui-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form
            className="flex flex-1 flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setQueryKeyword(keyword.trim());
            }}
          >
            <div className="min-w-56 flex-1">
              <Label htmlFor="knowledge-keyword" className="sr-only">
                搜索知识库
              </Label>
              <Input
                id="knowledge-keyword"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索标题、分类或内容"
                className="h-9 text-xs"
              />
            </div>
            <Button type="submit" className="h-9">
              搜索
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              onClick={() => {
                setKeyword("");
                setQueryKeyword("");
              }}
            >
              重置
            </Button>
          </form>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            新增文档
          </Button>
        </div>
      </section>

      <section className="ui-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">知识库文档</h2>
          <Badge variant="outline">{formatNumber(records.length)} 条</Badge>
        </div>
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="知识库没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={queryKeyword ? "没有匹配的文档" : "知识库还是空的"}
            description={
              queryKeyword
                ? "换个关键词，或清空搜索条件。"
                : "添加花语、养护、配送与售后说明，AI 回答会引用这些内容。"
            }
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                新增文档
              </Button>
            }
            bare
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>标题</TH>
                  <TH>分类</TH>
                  <TH>来源</TH>
                  <TH>状态</TH>
                  <TH>更新时间</TH>
                  <TH className="text-right">操作</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((document) => (
                  <TR key={document.id}>
                    <TD className="max-w-72">
                      <p className="truncate text-xs font-medium">{document.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                        {document.content}
                      </p>
                    </TD>
                    <TD>
                      <Badge variant="outline">{document.category}</Badge>
                    </TD>
                    <TD className="max-w-40 truncate text-[11px] text-muted-foreground">
                      {document.source || "-"}
                    </TD>
                    <TD>
                      <Badge variant={document.enabled ? "success" : "secondary"}>
                        {document.enabled ? "启用" : "停用"}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-[11px] text-muted-foreground tabular">
                      {formatDateTime(document.updatedAt)}
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="编辑文档"
                          onClick={() => openEdit(document)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="删除文档"
                          onClick={() => setDeleting(document)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
            setForm({ ...EMPTY_FORM });
          }
        }}
        title={editing ? "编辑知识库文档" : "新增知识库文档"}
        description="知识库内容会进入公开 AI 问答上下文，请只填写可对匿名用户公开的内容。保存后会自动触发增量索引；AI 服务不可用时文档仍会保存在数据库中。"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => save.mutate()}
              loading={save.isPending}
              disabled={!form.title.trim() || !form.category.trim() || !form.content.trim()}
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-title">标题</Label>
              <Input
                id="knowledge-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                maxLength={120}
                placeholder="例如：玫瑰养护要点"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-category">分类</Label>
              <Input
                id="knowledge-category"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                maxLength={30}
                placeholder="例如：养护 / 配送 / 售后"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="knowledge-source">来源</Label>
            <Input
              id="knowledge-source"
              value={form.source ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
              maxLength={200}
              placeholder="例如：花艺师手册 / 门店规范"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="knowledge-content">内容</Label>
            <Textarea
              id="knowledge-content"
              value={form.content}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, content: event.target.value }))
              }
              rows={8}
              placeholder="仅填写可公开的花语、养护、配送、售后说明，写清适用场景和注意事项。"
              className="text-xs"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium">启用</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                停用后不会参与 AI 检索与回答。
              </p>
            </div>
            <Switch
              checked={form.enabled ?? true}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: checked }))}
              label="启用知识库文档"
            />
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="删除知识库文档"
        description={`确定删除「${deleting?.title ?? ""}」吗？删除后 AI 将不再引用这条内容。`}
        confirmText="删除"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="ui-card flex items-center gap-2.5 px-3.5 py-3">
      <span
        className={
          tone === "success"
            ? "flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success"
            : tone === "warning"
              ? "flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning"
              : tone === "danger"
                ? "flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
                : "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
        }
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold tracking-tight tabular">{value}</p>
      </div>
    </div>
  );
}
