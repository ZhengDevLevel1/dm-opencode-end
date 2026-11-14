import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { buildCustomAccentVars } from "@/lib/custom-accent";
import { useThemeStore } from "@/stores/theme";

const ResolvedThemeContext = createContext(false);

export function useResolvedDark(): boolean {
  return useContext(ResolvedThemeContext);
}

function applyCustomAccent(color: string) {
  const root = document.documentElement;
  Object.entries(buildCustomAccentVars(color)).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

function clearCustomAccent() {
  const root = document.documentElement;
  [
    "--primary",
    "--primary-foreground",
    "--primary-solid",
    "--primary-solid-foreground",
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
  const componentOpacity = useThemeStore((state) => state.componentOpacity);

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
    root.style.setProperty("--ui-surface-opacity", String(componentOpacity));
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
    componentOpacity,
  ]);

  return (
    <ResolvedThemeContext.Provider value={resolvedDark}>
      {children}
    </ResolvedThemeContext.Provider>
  );
}
