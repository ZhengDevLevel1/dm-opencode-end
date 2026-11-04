import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  MessageCircleReply,
  MessageSquareText,
  MoreHorizontal,
  RotateCcw,
  Search,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "@/stores/toast";
import type { AdminReviewQuery, ReviewStatus, ReviewVO } from "@/types/api";
import { Rating } from "@/components/domain/rating";
import { ReviewStatusBadge } from "@/components/domain/status-badge";
import { UserAvatar } from "@/components/domain/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const PAGE_SIZE = 10;

const reviewStatusOptions: Array<{ value: ReviewStatus; label: string }> = [
  { value: "VISIBLE", label: "显示中" },
  { value: "HIDDEN", label: "已隐藏" },
];

export function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const productIdParam = searchParams.get("productId") ?? "";
  const [draftProductId, setDraftProductId] = useState(productIdParam);
  const [productId, setProductId] = useState(productIdParam);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<ReviewVO | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    review: ReviewVO;
    next: ReviewStatus;
  } | null>(null);

  useEffect(() => {
    if (!productIdParam) return;
    setDraftProductId(productIdParam);
    setProductId(productIdParam);
    setPage(1);
  }, [productIdParam]);

  const params = useMemo<AdminReviewQuery>(() => {
    const numeric = Number(productId);
    return {
      page,
      size: PAGE_SIZE,
      productId:
        productId.trim() && Number.isInteger(numeric) && numeric > 0 ? numeric : undefined,
      status: status ? (status as ReviewStatus) : undefined,
    };
  }, [page, productId, status]);

  const query = useQuery({
    queryKey: queryKeys.adminReviews(params),
    queryFn: () => adminService.reviews(params),
    placeholderData: (previous) => previous,
  });

  const statusMutation = useMutation({
    mutationFn: ({ review, next }: { review: ReviewVO; next: ReviewStatus }) =>
      adminService.setReviewStatus(review.id, next),
    onSuccess: (review) => {
      toast.success(
        review.status === "VISIBLE" ? "评价已显示" : "评价已隐藏",
        "商品评分与公开评价列表会同步更新。",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
      setStatusTarget(null);
    },
    onError: (error) => toast.error("状态更新失败", getErrorMessage(error)),
  });

  const activeFilters = [productId, status].filter(Boolean).length;
  const records = query.data?.records ?? [];

  const clearFilters = () => {
    setDraftProductId("");
    setProductId("");
    setStatus("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">评价管理</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          显示或隐藏评价会影响商品评分统计与公开评价列表；回复评价会覆盖原有回复。
        </p>
      </div>

      <div className="ui-card p-4">
        <form
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-8"
          onSubmit={(event) => {
            event.preventDefault();
            setProductId(draftProductId);
            setPage(1);
          }}
        >
          <div className="relative xl:col-span-4">
            <Label htmlFor="admin-review-product" className="sr-only">
              商品 ID
            </Label>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-review-product"
              value={draftProductId}
              onChange={(event) => setDraftProductId(event.target.value)}
              placeholder="按商品 ID 筛选"
              inputMode="numeric"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="admin-review-status" className="sr-only">
              状态
            </Label>
            <CustomSelect
              id="admin-review-status"
              value={status}
              onChange={(next) => {
                setStatus(next);
                setPage(1);
              }}
              options={reviewStatusOptions}
              placeholder="全部状态"
              className="h-9 text-xs"
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
            <MessageSquareText className="h-3.5 w-3.5" />
            共 {formatNumber(query.data?.total)} 条评价
          </div>
          <p className="text-[11px] text-muted-foreground">隐藏评价不会删除内容</p>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="评价列表没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title={activeFilters > 0 ? "没有符合筛选条件的评价" : "还没有评价"}
            description={
              activeFilters > 0
                ? "试试清除筛选条件，或换一个商品 ID。"
                : "用户完成订单后留下的评价会出现在这里。"
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
                  <TH>评价人</TH>
                  <TH>商品</TH>
                  <TH className="min-w-64">评价内容</TH>
                  <TH>状态</TH>
                  <TH>时间</TH>
                  <TH className="text-right">操作</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((review) => (
                  <TR key={review.id} className="align-top">
                    <TD className="min-w-36 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={review.nickname || "匿名用户"} size="sm" />
                        <div>
                          <p className="text-xs font-medium">
                            {review.nickname || "匿名用户"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            订单{" "}
                            <Link
                              to={`/staff/orders/${review.orderId}`}
                              className="text-primary hover:underline"
                            >
                              #{review.orderId}
                            </Link>
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="min-w-36 py-3">
                      <Link
                        to={`/products/${review.productId}`}
                        className="text-xs font-medium hover:text-primary hover:underline"
                      >
                        {review.productName || `商品 #${review.productId}`}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        #{review.productId}
                      </p>
                    </TD>
                    <TD className="min-w-64 py-3">
                      <Rating value={review.rating} showValue={false} compact />
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {review.content || "（未填写文字评价）"}
                      </p>
                      {review.reply ? (
                        <p className="mt-1.5 line-clamp-2 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                          回复：{review.reply}
                        </p>
                      ) : null}
                    </TD>
                    <TD className="py-3">
                      <ReviewStatusBadge status={review.status} label={review.statusLabel} />
                      <Badge variant="outline" className="mt-1 block w-fit">
                        {review.rating} 分
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap py-3 text-[11px] text-muted-foreground tabular">
                      {formatDateTime(review.createdAt)}
                    </TD>
                    <TD className="py-3 text-right">
                      <DropdownMenu
                        triggerLabel={`评价 #${review.id} 操作`}
                        trigger={
                          <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        }
                      >
                        <DropdownItem onClick={() => setReplying(review)}>
                          <MessageCircleReply className="h-3.5 w-3.5" />
                          {review.reply ? "修改回复" : "回复评价"}
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            setStatusTarget({
                              review,
                              next: review.status === "VISIBLE" ? "HIDDEN" : "VISIBLE",
                            })
                          }
                        >
                          {review.status === "VISIBLE" ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              隐藏评价
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              设为可见
                            </>
                          )}
                        </DropdownItem>
                      </DropdownMenu>
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

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={
          statusTarget?.next === "HIDDEN" ? "隐藏这条评价？" : "重新显示这条评价？"
        }
        description={
          statusTarget?.next === "HIDDEN"
            ? "隐藏后不会出现在公开评价列表，也不计入商品评分。评价内容不会被删除。"
            : "显示后会重新出现在公开评价列表，并重新计入商品评分。"
        }
        confirmText={statusTarget?.next === "HIDDEN" ? "隐藏评价" : "显示评价"}
        destructive={statusTarget?.next === "HIDDEN"}
        loading={statusMutation.isPending}
        onConfirm={() => {
          if (statusTarget) statusMutation.mutate(statusTarget);
        }}
      />

      <ReplyDialog
        review={replying}
        onOpenChange={(open) => !open && setReplying(null)}
      />
    </div>
  );
}

function ReplyDialog({
  review,
  onOpenChange,
}: {
  review: ReviewVO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  useEffect(() => {
    setReply(review?.reply ?? "");
  }, [review]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!review) throw new Error("缺少评价信息");
      return adminService.replyReview(review.id, { reply: reply.trim() });
    },
    onSuccess: () => {
      toast.success("回复已保存", "回复会覆盖原有内容。");
      void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
      onOpenChange(false);
    },
    onError: (error) => toast.error("回复失败", getErrorMessage(error)),
  });

  const invalid = !reply.trim() || reply.trim().length > 500;

  return (
    <Dialog
      open={Boolean(review)}
      onOpenChange={onOpenChange}
      title="回复评价"
      description={
        review
          ? `${review.nickname || "匿名用户"} 对「${review.productName || `商品 #${review.productId}`}」的评价`
          : undefined
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">{reply.length}/500</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              size="sm"
              loading={mutation.isPending}
              disabled={invalid}
              onClick={() => mutation.mutate()}
            >
              保存回复
            </Button>
          </div>
        </div>
      }
    >
      {review ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <Rating value={review.rating} showValue={false} compact />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {review.content || "（未填写文字评价）"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-review-reply">回复内容 *</Label>
            <textarea
              id="admin-review-reply"
              rows={5}
              maxLength={500}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="以店铺身份回复这条评价…"
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground">
              当前接口是设置回复，不会追加历史内容。
            </p>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
