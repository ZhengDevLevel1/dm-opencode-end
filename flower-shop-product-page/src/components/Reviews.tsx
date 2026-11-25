import { useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { product, ratingBreakdown, reviews } from "@/data/product";
import { SectionHeading } from "@/components/ui";
import { StarIcon, ThumbsUpIcon, FlowerIcon, ChevronDown, SparkIcon } from "@/components/icons";

const filters = ["全部 2,861", "带图 1,402", "5 星 2,541", "回购 618", "追评 233"];
const PREVIEW_COUNT = 3;
const LONG_AT = 60;

export default function Reviews() {
  const [filter, setFilter] = useState("全部 2,861");
  const [liked, setLiked] = useState<number[]>([]);
  const [sort, setSort] = useState<"hot" | "new">("hot");
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [openReplies, setOpenReplies] = useState<number[]>([]);
  const listRef = useRef<HTMLUListElement>(null);

  const max = Math.max(...ratingBreakdown.map((r) => r.count));

  const sorted = useMemo(() => {
    const list = [...reviews];
    return sort === "hot"
      ? list.sort(
          (a, b) =>
            (liked.includes(b.id) ? 1 : 0) - (liked.includes(a.id) ? 1 : 0) ||
            b.likes - a.likes,
        )
      : list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [sort, liked]);

  const visible = showAll ? sorted : sorted.slice(0, PREVIEW_COUNT);

  const toggleExpanded = (id: number) =>
    setExpanded((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const toggleReply = (id: number) =>
    setOpenReplies((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const collapseAll = () => {
    setShowAll(false);
    setExpanded([]);
    setOpenReplies([]);
    requestAnimationFrame(() =>
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        kicker="What people said"
        title="他们收到花之后"
        sub={`${product.reviewCount.toLocaleString()} 位顾客的真实反馈 · 好评率 98.4%`}
        className="border-b border-cream-200 pb-6"
      />

      {/* Summary */}
      <div className="grid gap-8 rounded-2xl border border-cream-200 bg-white/80 p-6 shadow-[0_28px_60px_-46px_rgba(20,32,26,0.6)] sm:grid-cols-[auto_1fr] sm:gap-10 sm:p-8">
        <div className="flex flex-col items-center justify-center gap-2 sm:w-40">
          <div className="font-serif text-[56px] leading-none font-semibold text-moss-900">
            {product.rating}
          </div>
          <div className="flex text-blush-500">
            {[0, 1, 2, 3, 4].map((i) => (
              <StarIcon key={i} className={cn("h-4 w-4", i > 3 && "opacity-60")} />
            ))}
          </div>
          <p className="text-[11px] tracking-wider text-moss-500">
            {product.reviewCount.toLocaleString()} 条评价 · 好评率 98.4%
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2.5">
          {ratingBreakdown.map((r) => (
            <div key={r.star} className="flex items-center gap-3">
              <span className="flex w-10 items-center gap-0.5 font-display text-[11px] text-moss-600">
                {r.star} <StarIcon className="h-2.5 w-2.5" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blush-400 to-blush-500 transition-all duration-700"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right font-display text-[11px] text-moss-500">
                {r.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12px] transition-all",
                filter === f
                  ? "border-moss-600 bg-moss-50 text-moss-900"
                  : "border-cream-200 text-moss-600 hover:border-moss-500/40",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[12px] text-moss-500">
          <button
            onClick={() => setSort("hot")}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              sort === "hot" && "bg-cream-100 text-moss-900",
            )}
          >
            最热
          </button>
          <button
            onClick={() => setSort("new")}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              sort === "new" && "bg-cream-100 text-moss-900",
            )}
          >
            最新
          </button>
        </div>
      </div>

      {/* List */}
      <ul ref={listRef} className="flex scroll-mt-44 flex-col divide-y divide-cream-200">
        {visible.map((r) => {
          const isLiked = liked.includes(r.id);
          const isOpen = expanded.includes(r.id);
          const isReplyOpen = openReplies.includes(r.id);
          const isLong = r.content.length > LONG_AT;

          return (
            <li key={r.id} className="flex gap-4 py-6 first:pt-0">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm tracking-wider text-cream-50"
                style={{ background: "#4a6b52" }}
              >
                {r.avatarSeed}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[13px] font-medium text-moss-900">{r.user}</span>
                  <span className="flex text-blush-500">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <StarIcon key={i} className="h-3 w-3" />
                    ))}
                  </span>
                  <span className="font-display text-[11px] tracking-wider text-moss-500/70">
                    {r.date}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-moss-500">{r.spec}</p>

                <p
                  className={cn(
                    "mt-2.5 text-[13.5px] leading-[1.85] text-moss-700",
                    isLong && !isOpen && "line-clamp-3",
                  )}
                >
                  {r.content}
                </p>
                {isLong && (
                  <button
                    onClick={() => toggleExpanded(r.id)}
                    aria-expanded={isOpen}
                    className="mt-1.5 inline-flex items-center gap-1 rounded text-[12px] tracking-wide text-blush-600 transition-colors hover:text-blush-500"
                  >
                    {isOpen ? "收起全文" : "展开全文"}
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </button>
                )}

                {r.images.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {r.images.map((img) => (
                      <img
                        key={img}
                        src={img}
                        alt="买家秀"
                        loading="lazy"
                        className="h-20 w-20 rounded-lg object-cover ring-1 ring-cream-200 transition-transform hover:scale-105"
                      />
                    ))}
                  </div>
                )}

                {/* Merchant reply — expand / collapse */}
                {r.reply && (
                  <div className="mt-3">
                    <button
                      onClick={() => toggleReply(r.id)}
                      aria-expanded={isReplyOpen}
                      className="group flex items-center gap-1.5 text-[12px] text-moss-600 transition-colors hover:text-moss-900"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-moss-50 text-moss-600 transition-colors group-hover:bg-moss-600 group-hover:text-cream-50">
                        <FlowerIcon className="h-2.5 w-2.5" />
                      </span>
                      {isReplyOpen ? "收起商家回复" : "查看商家回复（1）"}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          isReplyOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isReplyOpen && (
                      <div className="animate-fade-up mt-2.5 rounded-xl border-l-2 border-blush-200 bg-cream-100/70 p-4">
                        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-moss-600">
                          <span className="font-medium text-moss-800">{r.reply.by}</span>
                          <span className="h-2.5 w-px bg-cream-200" />
                          <span className="font-display tracking-wider text-moss-500/80">
                            {r.reply.time}
                          </span>
                        </p>
                        <p className="mt-2 text-[13px] leading-[1.85] text-moss-700">
                          {r.reply.text}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-1 text-[11px] text-moss-600"
                      >
                        <FlowerIcon className="h-3 w-3 text-blush-400" />
                        {t}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setLiked((l) => (isLiked ? l.filter((x) => x !== r.id) : [...l, r.id]))
                    }
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all",
                      isLiked
                        ? "border-blush-400 bg-blush-50 text-blush-600"
                        : "border-cream-200 text-moss-500 hover:text-moss-900",
                    )}
                  >
                    <ThumbsUpIcon className="h-3.5 w-3.5" />
                    有用 {r.likes + (isLiked ? 1 : 0)}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Expand / collapse the whole thread */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => (showAll ? collapseAll() : setShowAll(true))}
          aria-expanded={showAll}
          className="group flex items-center gap-2.5 rounded-full border border-cream-200 bg-white px-7 py-3 text-[13px] tracking-wider text-moss-700 transition-all hover:border-moss-600 hover:bg-moss-50 hover:text-moss-900"
        >
          {showAll ? (
            <>
              收起评论
              <ChevronDown className="h-4 w-4 rotate-180 transition-transform duration-300" />
            </>
          ) : (
            <>
              <SparkIcon className="h-4 w-4 text-blush-500" />
              展开全部 {product.reviewCount.toLocaleString()} 条评价
              <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </>
          )}
        </button>
        <p className="font-display text-[11px] tracking-[0.2em] text-moss-500/70">
          {visible.length} / {sorted.length} 条已展示
        </p>
      </div>
    </div>
  );
}
