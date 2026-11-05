import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type PaletteId =
  | "default"
  | "rose-pine-dawn"
  | "catppuccin-latte"
  | "everforest-light"
  | "rose-pine";
export type AccentId = "sky" | "blue" | "violet" | "rose" | "emerald" | "amber" | "orange" | "custom";
export type RadiusId = "compact" | "default" | "comfortable" | "round";
export type DensityId = "compact" | "comfortable";
export type SidebarStyleId = "follow" | "panel" | "accent";
export type BackgroundId = "solid" | "gradient" | "image";

export interface ThemeState {
  mode: ThemeMode;
  palette: PaletteId;
  accent: AccentId;
  customAccent: string;
  radius: RadiusId;
  density: DensityId;
  sidebarStyle: SidebarStyleId;
  scale: number;
  reduceMotion: boolean;
  highContrast: boolean;
  background: BackgroundId;
  backgroundImage: string;
  backgroundOpacity: number;
  backgroundBlur: number;
  componentOpacity: number;
  set: (patch: Partial<ThemeState>) => void;
  reset: () => void;
  exportTheme: () => string;
  importTheme: (json: string) => boolean;
}

export const DEFAULT_BACKGROUND_OPACITY = 0.82;
export const DEFAULT_BACKGROUND_BLUR = 0;
export const DEFAULT_COMPONENT_OPACITY = 1;

const DEFAULT_THEME = {
  mode: "system" as ThemeMode,
  palette: "default" as PaletteId,
  accent: "sky" as AccentId,
  customAccent: "#38bdf8",
  radius: "default" as RadiusId,
  density: "comfortable" as DensityId,
  sidebarStyle: "follow" as SidebarStyleId,
  scale: 1,
  reduceMotion: false,
  highContrast: false,
  background: "solid" as BackgroundId,
  backgroundImage: "",
  backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
  backgroundBlur: DEFAULT_BACKGROUND_BLUR,
  componentOpacity: DEFAULT_COMPONENT_OPACITY,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_THEME,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_THEME }),
      exportTheme: () => {
        const theme = get();
        const payload = Object.fromEntries(
          Object.keys(DEFAULT_THEME).map((key) => [key, theme[key as keyof ThemeState]]),
        );
        return JSON.stringify(payload, null, 2);
      },
      importTheme: (json) => {
        try {
          const parsed: unknown = JSON.parse(json);
          if (!parsed || typeof parsed !== "object") return false;
          const source = parsed as Record<string, unknown>;
          const next: Partial<ThemeState> = {};
          (Object.keys(DEFAULT_THEME) as Array<keyof typeof DEFAULT_THEME>).forEach((key) => {
            if (source[key] !== undefined) {
              (next as Record<string, unknown>)[key] = source[key];
            }
          });
          set(next);
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "flower.theme",
      version: 3,
      // v2：默认模糊由 6px 调整为 0；v3：移除「无背景」，旧值归并为纯色。
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<ThemeState>;
        const next = { ...state } as ThemeState;
        if (version < 2 && state.backgroundBlur === 6) {
          next.backgroundBlur = 0;
        }
        if (version < 3 && (state.background as string | undefined) === "none") {
          next.background = "solid";
        }
        return next;
      },
      partialize: (state) => {
        const { set: _set, reset: _reset, exportTheme: _export, importTheme: _import, ...rest } = state;
        void _set;
        void _reset;
        void _export;
        void _import;
        return rest;
      },
    },
  ),
);
