import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Heart, Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNumber, formatScore } from "@/lib/format";
import type { RecommendationItemVO } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProductImage } from "./product-image";
import { Price } from "./price";
import { TagList } from "./tag-list";
import { Rating } from "./rating";

interface RecommendationCardProps {
  item: RecommendationItemVO;
  isFavorite?: boolean;
  favoritePending?: boolean;
  addPending?: boolean;
  onFavorite?: (item: RecommendationItemVO) => void;
  onAddToCart?: (item: RecommendationItemVO) => void;
  showScores?: boolean;
}

const scoreItems = [
  { key: "contentSimilarity", label: "内容相似度" },
  { key: "popularityScore", label: "销量热度" },
  { key: "festivalSeasonScore", label: "节日 / 季节" },
  { key: "ratingScore", label: "评分表现" },
] as const;

export function RecommendationCard({
  item,
  isFavorite,
  favoritePending,
  addPending,
  onFavorite,
  onAddToCart,
  showScores,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tags = [...item.matchedTags, ...item.occasionTags, ...item.festivalTags].filter(
    (tag, index, list) => list.indexOf(tag) === index,
  );

  return (
    <article className="ui-card flex flex-col overflow-hidden">
      <Link to={`/products/${item.productId}`} className="group block">
        <ProductImage
          src={item.imageUrl}
          alt={item.name}
          seed={item.name}
          className="aspect-[5/4] w-full transition-transform duration-300 group-hover:scale-[1.015]"
          overlay={
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
              <span className="rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur">
                {item.priceBand}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                <Sparkles className="h-3 w-3" />
                {formatScore(item.score)}
              </span>
            </div>
          }
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/products/${item.productId}`}
            className="line-clamp-1 text-sm font-semibold tracking-tight hover:text-primary"
          >
            {item.name}
          </Link>
          <span className="shrink-0 text-[10px] text-muted-foreground">{item.seasonLabel}</span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
        <TagList tags={tags} max={3} tone="flower" />
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Price amount={item.price} originalAmount={item.originalPrice} size="sm" />
          <Rating value={item.ratingAvg} count={item.ratingCount} compact />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground tabular">
            销量 {formatNumber(item.salesCount)}
          </p>
          <div className="flex items-center gap-1">
            {showScores ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[11px] text-muted-foreground"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
              >
                推荐依据
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
              </Button>
            ) : null}
            {onFavorite ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={isFavorite ? "取消收藏" : "收藏"}
                disabled={favoritePending}
                onClick={() => onFavorite(item)}
              >
                {favoritePending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorite ? "fill-flower-rose text-flower-rose" : "text-muted-foreground",
                    )}
                  />
                )}
              </Button>
            ) : null}
            {onAddToCart ? (
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="加入购物车"
                disabled={addPending}
                onClick={() => onAddToCart(item)}
              >
                {addPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
        </div>
        {showScores && expanded ? (
          <div className="space-y-2 rounded-lg bg-muted/60 p-2.5">
            {scoreItems.map((score) => (
              <div key={score.key} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{score.label}</span>
                  <span className="tabular">{formatScore(item[score.key])}</span>
                </div>
                <Progress value={item[score.key] * 100} className="h-1" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
