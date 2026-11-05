import { useQuery } from "@tanstack/react-query";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import { appearanceService, cartService, dictService, favoriteService } from "@/lib/services";
import { useAuthStore } from "@/stores/auth";

export function useAuthBackgroundQuery() {
  return useQuery({
    queryKey: queryKeys.authBackground,
    queryFn: appearanceService.authBackground,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDict() {
  return useQuery({
    queryKey: queryKeys.dict,
    queryFn: dictService.options,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useCartQuery(enabled = true) {
  const authenticated = useAuthStore((state) => Boolean(state.user));
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: cartService.list,
    enabled: enabled && authenticated,
    staleTime: queryPolicy.cart.staleTime,
  });
}

export function useFavoritesQuery(enabled = true) {
  const authenticated = useAuthStore((state) => Boolean(state.user));
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: favoriteService.list,
    enabled: enabled && authenticated,
    staleTime: 30 * 1000,
  });
}
