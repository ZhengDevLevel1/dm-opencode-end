import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

export function invalidateCatalogQueries(queryClient: QueryClient, productId?: number) {
  const prefixes: ReadonlyArray<ReadonlyArray<string>> = [
    ["products"],
    queryKeys.hotProducts,
    ["recommendations"],
    ["staff", "products"],
    ["staff", "inventory"],
    ["admin", "products"],
    queryKeys.adminOverview,
    queryKeys.adminTopProducts,
    queryKeys.adminCategorySales,
    queryKeys.flowerMaterials,
    queryKeys.wrapColors,
    queryKeys.adminFlowerMaterials,
    queryKeys.adminWrapColors,
  ];

  prefixes.forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });

  if (productId === undefined) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.product(productId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminProduct(productId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.staffProduct(productId) });
}
