import { useQuery } from "@tanstack/react-query";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import {
  addressService,
  appearanceService,
  cartService,
  dictService,
  favoriteService,
} from "@/lib/services";
import { useAuthStore } from "@/stores/auth";
import type { AuthBackgroundVO } from "@/types/api";

const AUTH_BACKGROUND_CACHE_KEY = "flower.appearance.auth-background";
const AUTH_BACKGROUND_MAX_AGE = 5 * 60 * 1000;

function readCachedAuthBackground(): AuthBackgroundVO | null {
  try {
    const raw = localStorage.getItem(AUTH_BACKGROUND_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { data?: AuthBackgroundVO };
    return cached.data ?? null;
  } catch {
    return null;
  }
}

function cacheAuthBackground(data: AuthBackgroundVO) {
  try {
    localStorage.setItem(AUTH_BACKGROUND_CACHE_KEY, JSON.stringify({ data }));
  } catch {
    /* storage unavailable */
  }
}

export function useAuthBackgroundQuery() {
  const cached = readCachedAuthBackground();
  return useQuery({
    queryKey: queryKeys.authBackground,
    queryFn: async () => {
      const data = await appearanceService.authBackground();
      cacheAuthBackground(data);
      return data;
    },
    initialData: cached ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: AUTH_BACKGROUND_MAX_AGE,
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

export function useAddressesQuery(enabled = true) {
  const authenticated = useAuthStore((state) => Boolean(state.user));
  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: addressService.list,
    enabled: enabled && authenticated,
    staleTime: 30 * 1000,
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
