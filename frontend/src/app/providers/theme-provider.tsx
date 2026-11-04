import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useThemeStore } from "@/stores/theme";

const ResolvedThemeContext = createContext(false);

export function useResolvedDark(): boolean {
  return useContext(ResolvedThemeContext);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62;
}

function applyCustomAccent(color: string) {
  const root = document.documentElement;
  const foreground = isLightColor(color) ? "oklch(18% 0.02 250)" : "oklch(99% 0.005 240)";
  root.style.setProperty("--primary", color);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--ring", color);
  root.style.setProperty("--sidebar-primary", color);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
  root.style.setProperty("--accent", `color-mix(in oklab, ${color} 16%, var(--background))`);
  root.style.setProperty(
    "--accent-foreground",
    `color-mix(in oklab, ${color} 62%, var(--foreground))`,
  );
  root.style.setProperty(
    "--sidebar-accent",
    `color-mix(in oklab, ${color} 18%, var(--background))`,
  );
  root.style.setProperty(
    "--sidebar-accent-foreground",
    `color-mix(in oklab, ${color} 62%, var(--foreground))`,
  );
}

function clearCustomAccent() {
  const root = document.documentElement;
  [
    "--primary",
    "--primary-foreground",
    "--ring",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--accent",
    "--accent-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
  ].forEach((property) => root.style.removeProperty(property));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode);
  const palette = useThemeStore((state) => state.palette);
  const accent = useThemeStore((state) => state.accent);
  const customAccent = useThemeStore((state) => state.customAccent);
  const radius = useThemeStore((state) => state.radius);
  const density = useThemeStore((state) => state.density);
  const sidebarStyle = useThemeStore((state) => state.sidebarStyle);
  const scale = useThemeStore((state) => state.scale);
  const reduceMotion = useThemeStore((state) => state.reduceMotion);
  const highContrast = useThemeStore((state) => state.highContrast);
  const background = useThemeStore((state) => state.background);
  const backgroundImage = useThemeStore((state) => state.backgroundImage);
  const backgroundOpacity = useThemeStore((state) => state.backgroundOpacity);
  const backgroundBlur = useThemeStore((state) => state.backgroundBlur);

  const [resolvedDark, setResolvedDark] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const resolve = () => {
      const dark = mode === "dark" || (mode === "system" && media.matches);
      setResolvedDark(dark);
      const root = document.documentElement;
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };
    resolve();
    if (mode === "system") {
      media.addEventListener("change", resolve);
      return () => media.removeEventListener("change", resolve);
    }
    return undefined;
  }, [mode]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = palette;
    root.dataset.accent = accent;
    root.dataset.radius = radius;
    root.dataset.density = density;
    root.dataset.sidebar = sidebarStyle;
    root.style.setProperty("--ui-scale", String(scale));
    root.classList.toggle("reduce-motion", reduceMotion);
    root.classList.toggle("high-contrast", highContrast);
    root.dataset.background = background;
    root.style.setProperty("--app-bg-opacity", String(backgroundOpacity));
    root.style.setProperty("--app-bg-blur", `${backgroundBlur}px`);
    if (background === "image" && backgroundImage) {
      root.style.setProperty("--app-bg-image", `url("${backgroundImage}")`);
    } else {
      root.style.setProperty("--app-bg-image", "none");
    }
    if (accent === "custom") {
      applyCustomAccent(customAccent);
    } else {
      clearCustomAccent();
    }
  }, [
    palette,
    accent,
    customAccent,
    radius,
    density,
    sidebarStyle,
    scale,
    reduceMotion,
    highContrast,
    background,
    backgroundImage,
    backgroundOpacity,
    backgroundBlur,
  ]);

  return (
    <ResolvedThemeContext.Provider value={resolvedDark}>
      {children}
    </ResolvedThemeContext.Provider>
  );
}
