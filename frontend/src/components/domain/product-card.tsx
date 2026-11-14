import { Flower2, Loader2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { splitTags } from "@/lib/format";
import type { ProductVO } from "@/types/api";
import { useDict } from "@/hooks/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "./product-image";
import { Price } from "./price";
import { Rating } from "./rating";
import { TagList } from "./tag-list";

interface ProductCardProps {
  product: ProductVO;
  isFavorite?: boolean;
  favoritePending?: boolean;
  addPending?: boolean;
  onFavorite?: (product: ProductVO) => void;
  onAddToCart?: (product: ProductVO) => void;
  className?: string;
}

export function ProductCard({
  product,
  isFavorite,
  favoritePending,
  addPending,
  onFavorite,
  onAddToCart,
  className,
}: ProductCardProps) {
  const offShelf = product.status === "OFF_SHELF";
  const soldOut = product.stock <= 0;
  const unavailable = offShelf || soldOut;
  const tags = splitTags(product.occasionTags);
  const dict = useDict();
  const stockLow = dict.data?.metrics?.stockLowThreshold ?? 10;
  const lowStock = !offShelf && product.stock > 0 && product.stock < stockLow;

  return (
    <article
      className={cn(
        "ui-card group relative flex flex-col overflow-hidden transition-[border-color,box-shadow,transform,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <Link to={`/products/${product.id}`} className="block focus-visible:outline-none">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          seed={product.name}
          className="aspect-[4/5] w-full"
          overlay={
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
              <Badge variant="overlay" className="text-[10px]">
                {product.priceBand}
              </Badge>
              {offShelf ? (
                <Badge variant="overlay" className="text-[10px]">
                  已下架
                </Badge>
              ) : soldOut ? (
                <span className="rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                  售罄
                </span>
              ) : null}
            </div>
          }
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/products/${product.id}`}
            className="line-clamp-2 text-sm font-semibold tracking-tight hover:text-primary focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </div>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {product.flowerMeaning || product.category}
        </p>
        <TagList tags={tags} max={2} tone="flower" className="min-h-5" />

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <Price amount={product.price} originalAmount={product.originalPrice} size="md" />
            <p className="mt-0.5 text-[10px] text-muted-foreground tabular">
              已售 {formatNumber(product.salesCount)} ·{" "}
              {offShelf
                ? "暂不可购买"
                : lowStock
                  ? `仅剩 ${product.stock} 件`
                  : `库存 ${product.stock}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onFavorite ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={isFavorite ? "取消收藏" : "收藏"}
                aria-pressed={Boolean(isFavorite)}
                aria-busy={favoritePending}
                disabled={favoritePending}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFavorite(product);
                }}
              >
                <Flower2
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isFavorite
                      ? "fill-flower-rose/15 text-flower-rose"
                      : "text-muted-foreground",
                  )}
                />
              </Button>
            ) : null}
            {onAddToCart ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="加入购物车"
                disabled={unavailable || addPending}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onAddToCart(product);
                }}
              >
                {addPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ) : null}
          </div>
        </div>
        <Rating value={product.ratingAvg} count={product.ratingCount} compact className="pt-0.5" />
      </div>
    </article>
  );
}
