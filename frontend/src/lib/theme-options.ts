import type { AccentId, PaletteId } from "@/stores/theme";

export interface ThemePaletteOption {
  value: PaletteId;
  label: string;
  description: string;
  background: string;
  surface: string;
  primary: string;
}

export interface ThemeAccentOption {
  value: AccentId;
  label: string;
  color: string;
}

export const themePalettes: ThemePaletteOption[] = [
  {
    value: "default",
    label: "清透晴空",
    description: "明亮、轻盈的默认主题",
    background: "#fbfdff",
    surface: "#ffffff",
    primary: "#38bdf8",
  },
  {
    value: "rose-pine-dawn",
    label: "玫瑰黎明",
    description: "温柔米白与灰粉",
    background: "#faf4ed",
    surface: "#fffaf3",
    primary: "#b4637a",
  },
  {
    value: "catppuccin-latte",
    label: "猫娘拿铁",
    description: "柔和冷调的奶油灰",
    background: "#eff1f5",
    surface: "#ffffff",
    primary: "#1e66f5",
  },
  {
    value: "everforest-light",
    label: "常青森林",
    description: "低饱和的草木气息",
    background: "#efebd4",
    surface: "#fdf6e3",
    primary: "#8da101",
  },
  {
    value: "rose-pine",
    label: "玫瑰松林",
    description: "深色浪漫的暗夜花园",
    background: "#191724",
    surface: "#1f1d2e",
    primary: "#ebbcba",
  },
];

export const themeAccents: ThemeAccentOption[] = [
  { value: "sky", label: "天空蓝", color: "#38bdf8" },
  { value: "blue", label: "群青", color: "#3b82f6" },
  { value: "violet", label: "紫罗兰", color: "#8b5cf6" },
  { value: "rose", label: "玫瑰", color: "#f43f5e" },
  { value: "emerald", label: "翡翠", color: "#10b981" },
  { value: "amber", label: "琥珀", color: "#f59e0b" },
  { value: "orange", label: "暖橙", color: "#f97316" },
];
