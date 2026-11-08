import { useEffect, useRef } from "react";
import { getErrorMessage } from "@/lib/api-client";
import { preferenceService } from "@/lib/services";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore, type ThemeState } from "@/stores/theme";
import { useUiStore } from "@/stores/ui";
import { toast } from "@/stores/toast";
import type { ThemePreference, ThemePreferenceRequest } from "@/types/api";

const GUEST_THEME_KEY = "flower.theme.guest";
const SAVE_DELAY = 500;

type ThemePayload = Omit<ThemePreferenceRequest, "backgroundImage"> & {
  backgroundImage: string;
};

function toPayload(state: ThemeState): ThemePayload {
  return {
    mode: state.mode,
    palette: state.palette,
    accent: state.accent,
    customAccent: state.customAccent,
    radius: state.radius,
    density: state.density,
    sidebarStyle: state.sidebarStyle,
    scale: state.scale,
    reduceMotion: state.reduceMotion,
    highContrast: state.highContrast,
    background: state.background,
    backgroundImage: state.backgroundImage,
    backgroundOpacity: state.backgroundOpacity,
    backgroundBlur: state.backgroundBlur,
    componentOpacity: state.componentOpacity,
    sidebarPinned: useUiStore.getState().sidebarPinned,
  };
}

function normalize(preference: ThemePreference): ThemePayload {
  return {
    mode: preference.mode,
    palette: preference.palette,
    accent: preference.accent,
    customAccent: preference.customAccent,
    radius: preference.radius,
    density: preference.density,
    sidebarStyle: preference.sidebarStyle,
    scale: preference.scale,
    reduceMotion: preference.reduceMotion,
    highContrast: preference.highContrast,
    background: preference.background,
    backgroundImage: preference.backgroundImage ?? "",
    backgroundOpacity: preference.backgroundOpacity,
    backgroundBlur: preference.backgroundBlur,
    componentOpacity: preference.componentOpacity,
    sidebarPinned: preference.sidebarPinned ?? false,
  };
}

function serialize(payload: ThemePayload): string {
  return JSON.stringify(payload);
}

function applyPayload(payload: ThemePayload) {
  const { sidebarPinned, ...theme } = payload;
  useThemeStore.setState(theme);
  useUiStore.getState().setSidebarPinned(sidebarPinned);
}

export function ThemePreferenceSync() {
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const applyingRef = useRef(false);
  const lastSyncedRef = useRef("");
  const prevUserIdRef = useRef<number | null>(useAuthStore.getState().user?.id ?? null);
  const prevStatusRef = useRef(status);
  const timerRef = useRef<number | null>(null);
  const failedRef = useRef(false);

  useEffect(() => {
    const wasAnonymous = prevStatusRef.current === "anonymous";
    prevStatusRef.current = status;
    if (status !== "authenticated" || userId === null) {
      if (userId === null && prevUserIdRef.current !== null) {
        const raw = localStorage.getItem(GUEST_THEME_KEY);
        applyingRef.current = true;
        if (raw) {
          try {
            const guest = JSON.parse(raw) as ThemePayload;
            applyPayload(guest);
            lastSyncedRef.current = serialize(guest);
          } catch {
            useThemeStore.getState().reset();
            lastSyncedRef.current = "";
          }
        } else {
          useThemeStore.getState().reset();
          lastSyncedRef.current = "";
        }
        useUiStore.getState().setSidebarPinned(false);
        prevUserIdRef.current = null;
        window.setTimeout(() => {
          applyingRef.current = false;
        }, 0);
      }
      return;
    }

    if (prevUserIdRef.current === null && wasAnonymous) {
      localStorage.setItem(GUEST_THEME_KEY, serialize(toPayload(useThemeStore.getState())));
    }
    prevUserIdRef.current = userId;
    failedRef.current = false;

    let cancelled = false;
    void (async () => {
      try {
        const preference = await preferenceService.get();
        if (cancelled) return;
        if (preference) {
          const payload = normalize(preference);
          applyingRef.current = true;
          lastSyncedRef.current = serialize(payload);
          applyPayload(payload);
          window.setTimeout(() => {
            applyingRef.current = false;
          }, 0);
          return;
        }
        const payload = toPayload(useThemeStore.getState());
        lastSyncedRef.current = serialize(payload);
        const saved = await preferenceService.save(payload);
        if (!cancelled) lastSyncedRef.current = serialize(normalize(saved));
      } catch {
        // 偏好接口不可用时保留本地主题，不阻断页面使用。
        applyingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || userId === null) return;

    const shouldSync = () => {
      if (applyingRef.current) return false;
      return serialize(toPayload(useThemeStore.getState())) !== lastSyncedRef.current;
    };

    const scheduleSave = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        const payload = toPayload(useThemeStore.getState());
        void preferenceService
          .save(payload)
          .then((saved) => {
            lastSyncedRef.current = serialize(normalize(saved));
          })
          .catch((error: unknown) => {
            if (failedRef.current) return;
            failedRef.current = true;
            toast.error("外观偏好保存失败", getErrorMessage(error));
          });
      }, SAVE_DELAY);
    };

    const unsubscribeTheme = useThemeStore.subscribe(() => {
      if (!shouldSync()) return;
      scheduleSave();
    });
    const unsubscribeUi = useUiStore.subscribe(() => {
      if (!shouldSync()) return;
      scheduleSave();
    });

    return () => {
      unsubscribeTheme();
      unsubscribeUi();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, userId]);

  return null;
}
