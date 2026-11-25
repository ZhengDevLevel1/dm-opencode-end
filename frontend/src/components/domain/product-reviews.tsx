import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  MessageSquareText,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image";
import { queryKeys } from "@/lib/query-keys";
import { reviewService } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Rating } from "@/components/domain/rating";
import { SectionHeading } from "@/components/domain/section-heading";
import { Skeleton } from "@/components/ui/skeleton";

type ReviewFilter = "all" | "images" | "five";
type ReviewSort = "recommended" | "newest";

const FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "images", label: "有图" },
  { value: "five", label: "5 星" },
];

function readLikes(productId: number): number[] {
  try {
    const raw = localStorage.getItem(`flower.review.likes.${productId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "number") : [];
  } catch {
    return [];
  }
}

function avatarTone(id: number): string {
  const tones = [
    "bg-flower-rose/15 text-flower-rose",
    "bg-flower-leaf/15 text-flower-leaf",
    "bg-flower-amber/20 text-flower-amber",
    "bg-primary/10 text-primary",
  ];
  return tones[id % tones.length] ?? tones[0];
}

interface ProductReviewsProps {
  productId: number;
  ratingAvg?: number;
  ratingCount?: number;
  className?: string;
}

export function ProductReviews({
  productId,
  ratingAvg = 0,
  ratingCount = 0,
  className,
}: ProductReviewsProps) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [sort, setSort] = useState<ReviewSort>("recommended");
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>(() => readLikes(productId));
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const reviews = useQuery({
    queryKey: queryKeys.reviewsProduct(productId, { page: 1, size: 50 }),
    queryFn: () => reviewService.productReviews(productId, { page: 1, size: 50 }),
    enabled: Number.isInteger(productId) && productId > 0,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    setLikedIds(readLikes(productId));
  }, [productId]);

  useEffect(() => {
    try {
      localStorage.setItem(`flower.review.likes.${productId}`, JSON.stringify(likedIds));
    } catch {
      // Local-only interaction; storage may be unavailable in private mode.
    }
  }, [likedIds, productId]);

  const records = useMemo(() => reviews.data?.records ?? [], [reviews.data]);
  const total = reviews.data?.total ?? ratingCount;
  const filtered = useMemo(() => {
    const list = records.filter((review) => {
      if (filter === "images") return (review.images?.length ?? 0) > 0;
      if (filter === "five") return review.rating >= 5;
      return true;
    });
    return [...list].sort((left, right) => {
      if (sort === "newest") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
      const leftLiked = likedIds.includes(left.id) ? 1 : 0;
      const rightLiked = likedIds.includes(right.id) ? 1 : 0;
      if (leftLiked !== rightLiked) return rightLiked - leftLiked;
      if (left.rating !== right.rating) return right.rating - left.rating;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [filter, likedIds, records, sort]);

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    records.forEach((review) => {
      const index = Math.min(5, Math.max(1, review.rating)) - 1;
      counts[index] += 1;
    });
    return counts;
  }, [records]);

  const visible = showAll ? filtered : filtered.slice(0, 3);
  const imageCount = records.filter((review) => (review.images?.length ?? 0) > 0).length;
  const positiveRate =
    records.length > 0
      ? Math.round((records.filter((review) => review.rating >= 4).length / records.length) * 100)
      : Math.round((ratingAvg / 5) * 100);

  const toggleLike = (id: number) => {
    setLikedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleExpanded = (id: number) => {
    setExpanded((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleReply = (id: number) => {
    setExpandedReplies((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  return (
    <div className={cn("space-y-5", className)}>
      <SectionHeading
        eyebrow="Reviews"
        title="他们收到花之后"
        description="来自真实订单的评价，愿每一束花都被温柔记录。"
        action={
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5">
            <Rating value={ratingAvg} count={ratingCount} />
          </div>
        }
      />

      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-5 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col justify-center border-b border-border/60 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-6">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-semibold tabular tracking-tight">
              {ratingAvg ? ratingAvg.toFixed(1) : "0.0"}
            </span>
            <span className="pb-1 text-xs text-muted-foreground">/ 5</span>
          </div>
          <Rating value={ratingAvg} showValue={false} className="mt-1" />
          <p className="mt-2 text-xs text-muted-foreground">
            {total} 条评价 · 好评率 {Math.min(100, Math.max(0, positiveRate))}%
          </p>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1] ?? 0;
            const percent = records.length > 0 ? Math.round((count / records.length) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-8 tabular">{star} 星</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-warning/70" style={{ width: `${percent}%` }} />
                </span>
                <span className="w-8 text-right tabular">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
                filter === item.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {item.label}
              {item.value === "images" && imageCount > 0 ? ` ${imageCount}` : ""}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card p-0.5">
          {[
            { value: "recommended" as const, label: "推荐" },
            { value: "newest" as const, label: "最新" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSort(item.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                sort === item.value
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {reviews.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : reviews.isError ? (
        <ErrorState
          compact
          description="用户评价加载失败。"
          onRetry={() => void reviews.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={records.length === 0 ? "还没有评价" : "没有符合条件的评价"}
          description={records.length === 0 ? "收到花后，欢迎留下第一份花香记忆。" : "试试切换筛选条件。"}
          bare
        />
      ) : (
        <>
          <div className="space-y-4">
            {visible.map((review) => {
              const isLiked = likedIds.includes(review.id);
              const isExpanded = expanded.includes(review.id);
              const long = (review.content?.length ?? 0) > 72;
              const replyExpanded = expandedReplies.includes(review.id);
              return (
                <article key={review.id} className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        avatarTone(review.id),
                      )}
                    >
                      {(review.nickname || "花友").slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium">{review.nickname || "匿名花友"}</span>
                        <Rating value={review.rating} showValue={false} compact />
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {review.rating >= 5 ? "非常满意" : review.rating >= 4 ? "整体不错" : "真实反馈"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pl-0 sm:pl-[52px]">
                    <p
                      className={cn(
                        "whitespace-pre-line text-sm leading-7 text-foreground/85",
                        !isExpanded && long && "line-clamp-3",
                      )}
                    >
                      {review.content || "这位花友只留下了星级评价。"}
                    </p>
                    {long ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(review.id)}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {isExpanded ? "收起" : "展开全文"}
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    ) : null}

                    {review.images && review.images.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.images.map((image) => {
                          const resolved = resolveImageUrl(image);
                          if (!resolved) return null;
                          return (
                            <button
                              key={image}
                              type="button"
                              onClick={() => setPreviewImage(resolved)}
                              className="group relative h-20 w-20 overflow-hidden rounded-xl border border-border/60"
                            >
                              <img
                                src={resolved}
                                alt="评价图片"
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
                                <ImageIcon className="h-4 w-4" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleLike(review.id)}
                        aria-pressed={isLiked}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                          isLiked
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                        )}
                      >
                        <ThumbsUp className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                        有用 {isLiked ? 1 : 0}
                      </button>
                      {review.reply ? (
                        <span className="text-[11px] text-muted-foreground">店家已回复</span>
                      ) : null}
                    </div>

                    {review.reply ? (
                      <div className="mt-3 rounded-xl bg-muted/45 px-3.5 py-2.5 text-xs leading-6 text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">花店回复</span>
                          <button
                            type="button"
                            onClick={() => toggleReply(review.id)}
                            className="text-[11px] text-primary hover:underline"
                          >
                            {replyExpanded ? "收起" : "展开"}
                          </button>
                        </div>
                        <p className={cn("mt-1", !replyExpanded && "line-clamp-1")}>{review.reply}</p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length > 3 ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "收起评论" : `展开全部 ${filtered.length} 条评价`}
              {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          ) : null}
        </>
      )}

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
        title="评价图片"
        size="lg"
      >
        {previewImage ? (
          <img src={previewImage} alt="评价图片预览" className="max-h-[70vh] w-full rounded-lg object-contain" />
        ) : null}
      </Dialog>
    </div>
  );
}
