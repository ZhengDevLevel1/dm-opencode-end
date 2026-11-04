import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  FileSearch,
  RotateCcw,
  ScrollText,
  Search,
  XCircle,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTimeFull, formatNumber } from "@/lib/format";
import type { OperationLog, OperationLogQuery } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const PAGE_SIZE = 20;

interface LogFilters {
  module: string;
  username: string;
  start: string;
  end: string;
}

const emptyFilters: LogFilters = { module: "", username: "", start: "", end: "" };

export function AdminLogsPage() {
  const [draft, setDraft] = useState<LogFilters>(emptyFilters);
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<OperationLog | null>(null);

  const params = useMemo<OperationLogQuery>(() => {
    const query: OperationLogQuery = { page, size: PAGE_SIZE };
    if (filters.module.trim()) query.module = filters.module.trim();
    if (filters.username.trim()) query.username = filters.username.trim();
    if (filters.start) query.start = `${filters.start}T00:00:00`;
    if (filters.end) query.end = `${filters.end}T23:59:59`;
    return query;
  }, [page, filters]);

  const query = useQuery({
    queryKey: queryKeys.adminLogs(params),
    queryFn: () => adminService.logs(params),
    placeholderData: (previous) => previous,
  });

  const activeFilters = Object.values(filters).filter((value) => value.trim() !== "").length;
  const records = query.data?.records ?? [];

  const clearFilters = () => {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">操作日志</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          追溯关键接口调用、请求参数、耗时与异常。模块为精确匹配，用户名为模糊匹配。
        </p>
      </div>

      <div className="ui-card p-4">
        <form
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-12"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters(draft);
            setPage(1);
          }}
        >
          <div className="xl:col-span-2">
            <Label htmlFor="log-module" className="sr-only">
              模块
            </Label>
            <Input
              id="log-module"
              value={draft.module}
              onChange={(event) =>
                setDraft((current) => ({ ...current, module: event.target.value }))
              }
              placeholder="模块，例如：订单"
              className="h-9 text-xs"
            />
          </div>
          <div className="relative xl:col-span-3">
            <Label htmlFor="log-username" className="sr-only">
              用户名
            </Label>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="log-username"
              value={draft.username}
              onChange={(event) =>
                setDraft((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="用户名模糊匹配"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="log-date-start" className="sr-only">
              开始日期
            </Label>
            <DatePicker
              id="log-date-start"
              value={draft.start}
              onChange={(next) => setDraft((current) => ({ ...current, start: next }))}
              placeholder="开始日期"
              className="h-9 text-xs"
              aria-label="开始日期"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="log-date-end" className="sr-only">
              结束日期
            </Label>
            <DatePicker
              id="log-date-end"
              value={draft.end}
              onChange={(next) => setDraft((current) => ({ ...current, end: next }))}
              placeholder="结束日期"
              className="h-9 text-xs"
              aria-label="结束日期"
            />
          </div>
          <div className="flex gap-2 xl:col-span-3">
            <Button type="submit" className="h-9 w-full px-6 sm:w-auto">
              搜索
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 shrink-0 px-4"
              onClick={clearFilters}
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
            <ScrollText className="h-3.5 w-3.5" />
            共 {formatNumber(query.data?.total)} 条日志
          </div>
          <p className="text-[11px] text-muted-foreground">点击任意行查看请求参数与异常信息</p>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="操作日志没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title={activeFilters > 0 ? "没有符合筛选条件的日志" : "还没有操作日志"}
            description={
              activeFilters > 0
                ? "试试清除筛选条件，或换一个模块 / 用户名。"
                : "关键接口被调用后，审计日志会出现在这里。"
            }
            bare
            action={
              activeFilters > 0 ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  清除筛选
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>时间</TH>
                  <TH>操作者</TH>
                  <TH>模块 / 操作</TH>
                  <TH>请求</TH>
                  <TH>结果</TH>
                  <TH>耗时</TH>
                  <TH>IP</TH>
                  <TH className="text-right">详情</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((log) => (
                  <TR
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setDetail(log)}
                  >
                    <TD className="whitespace-nowrap py-2.5 text-[11px] text-muted-foreground tabular">
                      {formatDateTimeFull(log.createdAt)}
                    </TD>
                    <TD className="text-xs">
                      {log.username || "—"}
                      {log.userId ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          #{log.userId}
                        </span>
                      ) : null}
                    </TD>
                    <TD>
                      <p className="text-xs font-medium">{log.module || "—"}</p>
                      <p className="max-w-44 truncate text-[10px] text-muted-foreground">
                        {log.operation || "—"}
                      </p>
                    </TD>
                    <TD>
                      <Badge variant="outline" className="font-mono-ui text-[10px]">
                        {log.requestMethod}
                      </Badge>
                      <p className="mt-0.5 max-w-56 truncate font-mono-ui text-[10px] text-muted-foreground">
                        {log.requestUri}
                      </p>
                    </TD>
                    <TD>
                      <Badge variant={log.success === 1 ? "success" : "destructive"}>
                        {log.success === 1 ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            成功
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            失败
                          </>
                        )}
                      </Badge>
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular">
                        <Clock3 className="h-3 w-3" />
                        {log.durationMs} ms
                      </span>
                    </TD>
                    <TD className="font-mono-ui text-[10px] text-muted-foreground">
                      {log.ip || "—"}
                    </TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetail(log);
                        }}
                      >
                        查看
                      </Button>
                    </TD>
                  </TR>
                ))}
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
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        title={`操作日志 #${detail?.id ?? ""}`}
        description={
          detail
            ? `${formatDateTimeFull(detail.createdAt)} · ${detail.username || "匿名"} · ${
                detail.module || "未知模块"
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
            <dl className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[10px] text-muted-foreground">操作</dt>
                <dd className="mt-0.5">{detail.operation || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">请求方法与路径</dt>
                <dd className="mt-0.5 font-mono-ui text-[11px]">
                  {detail.requestMethod} {detail.requestUri}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">方法</dt>
                <dd className="mt-0.5 font-mono-ui text-[11px]">{detail.method || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">结果</dt>
                <dd className="mt-0.5">
                  <Badge variant={detail.success === 1 ? "success" : "destructive"}>
                    {detail.success === 1 ? "成功" : "失败"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">耗时</dt>
                <dd className="mt-0.5 tabular">{detail.durationMs} ms</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">IP</dt>
                <dd className="mt-0.5 font-mono-ui text-[11px]">{detail.ip || "—"}</dd>
              </div>
            </dl>

            <div>
              <h3 className="text-xs font-semibold">请求参数</h3>
              <pre className="mt-1.5 max-h-56 overflow-auto rounded-lg bg-muted/60 p-3 font-mono-ui text-[11px] leading-relaxed whitespace-pre-wrap">
                {detail.requestParams || "—"}
              </pre>
            </div>

            {detail.errorMessage ? (
              <div>
                <h3 className="text-xs font-semibold text-destructive">异常信息</h3>
                <pre className="mt-1.5 max-h-40 overflow-auto rounded-lg border border-destructive/20 bg-destructive/[0.04] p-3 font-mono-ui text-[11px] leading-relaxed whitespace-pre-wrap text-destructive">
                  {detail.errorMessage}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
