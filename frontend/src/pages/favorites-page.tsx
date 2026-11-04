import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flower2 } from "lucide-react";
import { useFavoritesQuery } from "@/hooks/queries";
import { cartService, favoriteService } from "@/lib/services";
import { getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import type { ProductVO } from "@/types/api";
import { ProductCard } from "@/components/domain/product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const favorites = useFavoritesQuery();
  const [favoritePendingId, setFavoritePendingId] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  const removeFavorite = useMutation({
    mutationFn: (productId: number) => favoriteService.remove(productId),
    onSuccess: () => {
      toast.success("已取消收藏");
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
    onError: (error) => toast.error("取消收藏失败", getErrorMessage(error)),
  });

  const handleFavorite = async (product: ProductVO) => {
    setFavoritePendingId(product.id);
    try {
      await removeFavorite.mutateAsync(product.id);
    } finally {
      setFavoritePendingId(null);
    }
  };

  const handleAddToCart = async (product: ProductVO) => {
    setAddingId(product.id);
    try {
      await cartService.add({ productId: product.id, quantity: 1 });
      toast.success("已加入购物车", product.name);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    } catch (error) {
      toast.error("加入购物车失败", getErrorMessage(error));
    } finally {
      setAddingId(null);
    }
  };

  const products = favorites.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">我的收藏</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            收好每一份心动，随时回来看看。
            {products.length > 0 ? ` 当前收藏 ${products.length} 件花礼。` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/products">
            <Flower2 className="h-3.5 w-3.5" />
            去发现更多
          </Link>
        </Button>
      </div>

      {favorites.isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : favorites.isError ? (
        <ErrorState
          title="收藏夹没送到"
          description={getErrorMessage(favorites.error)}
          onRetry={() => void favorites.refetch()}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Flower2}
          title="收藏夹还是空的"
          description="浏览花礼时点一下花朵，就能把喜欢的款式收在这里。"
          action={
            <Button onClick={() => navigate("/products")}>去逛逛花礼</Button>
          }
          className="py-24"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite
              favoritePending={favoritePendingId === product.id}
              addPending={addingId === product.id}
              onFavorite={handleFavorite}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
