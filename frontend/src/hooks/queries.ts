import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSnapToLandmark, saveSnapToLandmark } from "@/lib/map-preferences";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import {
  addressService,
  appearanceService,
  cartService,
  catalogService,
  dictService,
  favoriteService,
  preferenceService,
} from "@/lib/services";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/stores/toast";
import type { AuthBackgroundVO, MapPreference } from "@/types/api";

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

export function useMapSnapPreference() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const queryKey = queryKeys.mapPreference(userId);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await preferenceService.getMap();
      saveSnapToLandmark(userId, data.snapToLandmark);
      return data;
    },
    enabled: Boolean(userId),
    initialData: () => ({ snapToLandmark: getSnapToLandmark(userId) }),
    initialDataUpdatedAt: 0,
    staleTime: 30 * 1000,
  });
  const mutation = useMutation({
    mutationFn: preferenceService.saveMap,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MapPreference>(queryKey);
      queryClient.setQueryData<MapPreference>(queryKey, next);
      saveSnapToLandmark(userId, next.snapToLandmark);
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
        saveSnapToLandmark(userId, context.previous.snapToLandmark);
      }
      void queryClient.invalidateQueries({ queryKey });
      toast.error("自动跳转地标设置保存失败", "请检查网络后重试");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      saveSnapToLandmark(userId, data.snapToLandmark);
    },
  });
  return {
    snapToLandmark: query.data?.snapToLandmark ?? false,
    setSnapToLandmark: (value: boolean) =>
      mutation.mutate({ snapToLandmark: value }),
    isLoading: query.isFetching,
    isSaving: mutation.isPending,
  };
}

export function useDict() {
  return useQuery({
    queryKey: queryKeys.dict,
    queryFn: dictService.options,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useFlowerMaterialsQuery() {
  return useQuery({
    queryKey: queryKeys.flowerMaterials,
    queryFn: catalogService.flowerMaterials,
    staleTime: 5 * 60 * 1000,
  });
}

export function useWrapColorsQuery() {
  return useQuery({
    queryKey: queryKeys.wrapColors,
    queryFn: catalogService.wrapColors,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBusinessHoursQuery() {
  return useQuery({
    queryKey: queryKeys.businessHours,
    queryFn: catalogService.businessHours,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStoreProfileQuery() {
  return useQuery({
    queryKey: queryKeys.storeProfile,
    queryFn: catalogService.storeProfile,
    staleTime: 5 * 60 * 1000,
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
