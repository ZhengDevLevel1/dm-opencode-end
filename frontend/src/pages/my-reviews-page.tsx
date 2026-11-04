import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareQuote, PenLine, Star, Store } from "lucide-react";
import { orderService, reviewService } from "@/lib/services";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { OrderItemVO, OrderVO, ReviewVO } from "@/types/api";
import { Rating, StarInput } from "@/components/domain/rating";
import { ReviewStatusBadge } from "@/components/domain/status-badge";
import { ProductImage } from "@/components/domain/product-image";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

const HISTORY_PAGE_SIZE = 6;

interface PendingItem {
  order: OrderVO;
  item: OrderItemVO;
}

export function MyReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const orderIdParam = Number(searchParams.get("orderId"));
  const orderItemIdParam = Number(searchParams.get("orderItemId"));
  const [tab, setTab] = useState("pending");
  const [historyPage, setHistoryPage] = useState(1);
  const [target, setTarget] = useState<PendingItem | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const autoOpenRef = useRef(false);

  const completedOrders = useQuery({
    queryKey: queryKeys.orders({ page: 1, size: 100, status: "COMPLETED" }),
    queryFn: () => orderService.list({ page: 1, size: 100, status: "COMPLETED" }),
    staleTime: 30_000,
  });

  const linkedOrder = useQuery({
    queryKey: queryKeys.order(orderIdParam),
    queryFn: () => orderService.detail(orderIdParam),
    enabled: Number.isInteger(orderIdParam) && orderIdParam > 0,
    staleTime: 30_000,
  });

  const history = useQuery({
    queryKey: queryKeys.reviewsMy({ page: historyPage, size: HISTORY_PAGE_SIZE }),
    queryFn: () => reviewService.myReviews({ page: historyPage, size: HISTORY_PAGE_SIZE }),
  });

  const sourceOrders = useMemo(() => {
    const list = completedOrders.data?.records ?? [];
    if (!linkedOrder.data) return list;
    return [linkedOrder.data, ...list.filter((order) => order.id !== linkedOrder.data?.id)];
  }, [completedOrders.data, linkedOrder.data]);

  const pendingItems = useMemo<PendingItem[]>(() => {
    const seen = new Set<number>();
    const items: PendingItem[] = [];
    sourceOrders.forEach((order) => {
      if (order.status !== "COMPLETED") return;
      order.items.forEach((item) => {
        if (item.reviewed || seen.has(item.id)) return;
        seen.add(item.id);
        items.push({ order, item });
      });
    });
    return items;
  }, [sourceOrders]);

  const openReview = (pending: PendingItem) => {
    setTarget(pending);
    setRating(5);
    setContent("");
    if (searchParams.has("orderId") || searchParams.has("orderItemId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("orderId");
      next.delete("orderItemId");
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (autoOpenRef.current) return;
    if (!Number.isInteger(orderIdParam) || orderIdParam <= 0) return;
    if (linkedOrder.isLoading) return;
    const match = pendingItems.find((pending) =>
      Number.isInteger(orderItemIdParam) && orderItemIdParam > 0
        ? pending.item.id === orderItemIdParam
        : pending.order.id === orderIdParam,
    );
    autoOpenRef.current = true;
    if (match) openReview(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedOrder.isLoading, orderIdParam, orderItemIdParam, pendingItems]);

  const createReview = useMutation({
    mutationFn: () =>
      reviewService.create({
        orderItemId: target?.item.id ?? 0,
        rating,
        content: content.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("评价已发布", "感谢分享真实感受。");
      setTarget(null);
      setContent("");
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 6001) {
          toast.info("这件花礼已评价过", "正在刷新待评价列表。");
          setTarget(null);
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          void queryClient.invalidateQueries({ queryKey: ["order"] });
          return;
        }
        if (error.code === 6002) {
          toast.error("当前订单状态不能评价", "只有已完成订单可以评价，正在刷新。");
          setTarget(null);
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          void queryClient.invalidateQueries({ queryKey: ["order"] });
          return;
        }
        if (error.code === 6003) {
          toast.error("评价目标不存在", "订单明细可能已变化，请刷新后重试。");
          setTarget(null);
          void queryClient.invalidateQueries({ queryKey: ["orders"] });
          return;
        }
      }
      toast.error("评价提交失败", getErrorMessage(error));
    },
  });

  const submitReview = () => {
    if (!target) return;
    if (rating < 1 || rating > 5) {
      toast.error("请选择 1-5 星评分");
      return;
    }
    createReview.mutate();
  };

  const closeReview = () => {
    if (createReview.isPending) return;
    setTarget(null);
    setContent("");
  };

  const historyRecords = history.data?.records ?? [];
  const historyTotal = history.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">我的评价</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            只有已完成订单可以评价，每件花礼限一次。真实评价会展示在商品详情页。
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/orders?status=COMPLETED">
            <Star className="h-3.5 w-3.5" />
            查看已完成订单
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            待评价
            {pendingItems.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary tabular">
                {pendingItems.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history">
            我的评价
            {historyTotal > 0 ? <span className="ml-1.5 text-[10px] tabular">{historyTotal}</span> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {completedOrders.isLoading || linkedOrder.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="ui-card p-4">
                  <TableSkeleton rows={2} />
                </div>
              ))}
            </div>
          ) : completedOrders.isError ? (
            <ErrorState
              title="待评价的花礼没送到"
              description={getErrorMessage(completedOrders.error)}
              onRetry={() => void completedOrders.refetch()}
            />
          ) : pendingItems.length === 0 ? (
            <EmptyState
              icon={Star}
              title="没有待评价的花礼"
              description="订单完成并签收后，就可以在这里分享真实感受。"
              action={
                <Button variant="outline" asChild>
                  <Link to="/orders">查看订单</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingItems.slice(0, 8).map(({ order, item }) => (
                <article key={item.id} className="ui-card flex gap-3 p-4">
                  <Link to={`/products/${item.productId}`} className="shrink-0">
                    <ProductImage
                      src={item.productImage}
                      alt={item.productName}
                      seed={item.productName}
                      className="h-20 w-16 rounded-lg"
                      iconClassName="h-6 w-6"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      to={`/products/${item.productId}`}
                      className="line-clamp-1 text-sm font-medium hover:text-primary"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {order.orderNo} · {formatDateTime(order.completedAt ?? order.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                      {item.quantity} 件 · {order.receiverName}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <Badge variant="secondary">已完成</Badge>
                      <Button size="sm" onClick={() => openReview({ order, item })}>
                        <PenLine className="h-3.5 w-3.5" />
                        去评价
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
              {pendingItems.length > 8 ? (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  还有 {pendingItems.length - 8} 件待评价花礼，进入对应订单详情即可继续评价。
                </p>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {history.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="ui-card p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-3 h-3 w-24" />
                  <Skeleton className="mt-3 h-12 w-full" />
                </div>
              ))}
            </div>
          ) : history.isError ? (
            <ErrorState
              title="评价记录没送到"
              description={getErrorMessage(history.error)}
              onRetry={() => void history.refetch()}
            />
          ) : historyRecords.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="还没有发表过评价"
              description="完成订单后，为喜欢的花礼留下真实感受吧。"
            />
          ) : (
            <div className="space-y-3">
              {historyRecords.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
          {history.data && history.data.total > 0 ? (
            <Pagination
              className="mt-4"
              page={history.data.page}
              pages={history.data.pages}
              total={history.data.total}
              pageSize={history.data.size}
              onPageChange={setHistoryPage}
            />
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) closeReview();
        }}
        title="评价这件花礼"
        description={
          target
            ? `${target.item.productName} · 订单 ${target.order.orderNo}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={closeReview} disabled={createReview.isPending}>
              取消
            </Button>
            <Button onClick={submitReview} loading={createReview.isPending}>
              发布评价
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ProductImage
              src={target?.item.productImage}
              alt={target?.item.productName ?? "花礼"}
              seed={target?.item.productName}
              className="h-16 w-14 rounded-lg"
              iconClassName="h-5 w-5"
            />
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-medium">{target?.item.productName}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                评价会按可见状态展示在商品详情页，隐藏评价不计入评分。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">评分 *</p>
            <StarInput value={rating} onChange={setRating} disabled={createReview.isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="review-content" className="text-xs font-medium">
              评价内容
            </label>
            <Textarea
              id="review-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={500}
              placeholder="选填，聊聊花材、包装或配送体验。"
              className="min-h-28"
              data-autofocus
            />
            <p className="text-right text-[11px] text-muted-foreground tabular">
              {content.length}/500
            </p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            提交后不可重复评价；如需调整内容，请联系门店工作人员。
          </p>
        </div>
      </Dialog>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewVO }) {
  return (
    <article className="ui-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {review.productName ? (
              <Link
                to={`/products/${review.productId}`}
                className="text-sm font-medium hover:text-primary"
              >
                {review.productName}
              </Link>
            ) : (
              <span className="text-sm font-medium">花礼 #{review.productId}</span>
            )}
            <ReviewStatusBadge status={review.status} label={review.statusLabel} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Rating value={review.rating} compact />
            <span className="text-[11px] text-muted-foreground">
              {formatDateTime(review.createdAt)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              订单 #{review.orderId}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
        {review.content ?? "这位顾客只留下了评分。"}
      </p>
      {review.reply ? (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <Store className="h-3 w-3" />
            门店回复
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{review.reply}</p>
        </div>
      ) : null}
    </article>
  );
}
