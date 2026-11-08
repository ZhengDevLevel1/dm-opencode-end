import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, Boxes, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/lib/services";
import { toast } from "@/stores/toast";

export function AdminMetricsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.adminMetrics,
    queryFn: adminService.metricConfig,
  });

  const [priceMid, setPriceMid] = useState("100");
  const [priceHigh, setPriceHigh] = useState("300");
  const [stockLow, setStockLow] = useState("10");
  const [stockHigh, setStockHigh] = useState("50");

  useEffect(() => {
    if (!query.data) return;
    setPriceMid(String(query.data.priceMidThreshold));
    setPriceHigh(String(query.data.priceHighThreshold));
    setStockLow(String(query.data.stockLowThreshold));
    setStockHigh(String(query.data.stockHighThreshold));
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminService.updateMetricConfig({
        priceMidThreshold: Number(priceMid),
        priceHighThreshold: Number(priceHigh),
        stockLowThreshold: Number(stockLow),
        stockHighThreshold: Number(stockHigh),
      }),
    onSuccess: () => {
      toast.success("指标已保存", "价格带与库存分档已更新。");
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminMetrics });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dict });
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "products"] });
    },
    onError: (error) => toast.error("保存指标失败", getErrorMessage(error)),
  });

  const priceValid =
    Number(priceMid) > 0 &&
    Number(priceHigh) > Number(priceMid) &&
    Number.isFinite(Number(priceMid)) &&
    Number.isFinite(Number(priceHigh));
  const stockValid =
    Number.isInteger(Number(stockLow)) &&
    Number.isInteger(Number(stockHigh)) &&
    Number(stockLow) >= 1 &&
    Number(stockHigh) > Number(stockLow);
  const valid = priceValid && stockValid;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">指标配置</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          调整价格带与库存分档阈值。保存后会同步影响商品标签、库存筛选、经营看板和智能推荐的价格特征。
        </p>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        <div className="ui-card">
          <ErrorState
            title="指标没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="ui-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BadgeDollarSign className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">价格带指标</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  用于商品卡片的「平价 / 中端 / 高端」标签，以及推荐算法的价格特征。
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="metric-price-mid">平价 / 中端分界</Label>
                <div className="relative">
                  <Input
                    id="metric-price-mid"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={priceMid}
                    onChange={(event) => setPriceMid(event.target.value)}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
                    元
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">低于该价格为平价。</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metric-price-high">中端 / 高端分界</Label>
                <div className="relative">
                  <Input
                    id="metric-price-high"
                    type="number"
                    min={0.02}
                    step={0.01}
                    value={priceHigh}
                    onChange={(event) => setPriceHigh(event.target.value)}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
                    元
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">达到该价格为高端。</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">当前分档</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <BandChip label="平价" detail={`< ¥${priceMid || "—"}`} tone="sage" />
                <BandChip
                  label="中端"
                  detail={`¥${priceMid || "—"} – ¥${priceHigh || "—"}`}
                  tone="amber"
                />
                <BandChip label="高端" detail={`≥ ¥${priceHigh || "—"}`} tone="rose" />
              </div>
            </div>
            {!priceValid ? (
              <p className="mt-2 text-[11px] text-destructive">高端分界必须大于中端分界。</p>
            ) : null}
          </section>

          <section className="ui-card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Boxes className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">库存指标</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  用于库存管理筛选、商品管理筛选、低库存角标和经营总览的低库存统计。
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="metric-stock-low">低库存 / 充足分界</Label>
                <div className="relative">
                  <Input
                    id="metric-stock-low"
                    type="number"
                    min={1}
                    step={1}
                    value={stockLow}
                    onChange={(event) => setStockLow(event.target.value)}
                    className="pr-9"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
                    件
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">低于该值为低库存。</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metric-stock-high">充足 / 过量分界</Label>
                <div className="relative">
                  <Input
                    id="metric-stock-high"
                    type="number"
                    min={2}
                    step={1}
                    value={stockHigh}
                    onChange={(event) => setStockHigh(event.target.value)}
                    className="pr-9"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
                    件
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">达到该值为过量库存。</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="text-[11px] font-medium text-muted-foreground">当前分档</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <BandChip label="低库存" detail={`< ${stockLow || "—"} 件`} tone="rose" />
                <BandChip
                  label="充足库存"
                  detail={
                    stockLow && stockHigh
                      ? `${stockLow} – ${Math.max(Number(stockLow), Number(stockHigh) - 1)} 件`
                      : "—"
                  }
                  tone="sage"
                />
                <BandChip label="过量库存" detail={`≥ ${stockHigh || "—"} 件`} tone="amber" />
              </div>
            </div>
            {!stockValid ? (
              <p className="mt-2 text-[11px] text-destructive">
                低库存阈值至少为 1，且过量库存阈值必须大于低库存阈值。
              </p>
            ) : null}
          </section>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
        <p className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          保存后会清理商品缓存，新阈值立即参与筛选、看板统计和推荐价格特征。
        </p>
        <Button
          type="button"
          size="sm"
          disabled={!valid}
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          保存指标
        </Button>
      </div>
    </div>
  );
}

function BandChip({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: "sage" | "amber" | "rose";
}) {
  const toneClass = {
    sage: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
    amber:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${toneClass}`}>
      <span className="font-medium">{label}</span>
      <span className="opacity-80">{detail}</span>
    </span>
  );
}
