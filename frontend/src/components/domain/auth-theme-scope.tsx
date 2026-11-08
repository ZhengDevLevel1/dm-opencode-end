import type { CSSProperties, ReactNode } from "react";
import { useResolvedDark } from "@/app/providers/theme-provider";
import { cn } from "@/lib/cn";
import type { AccentId, PaletteId } from "@/stores/theme";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isLightColor(hex: string): boolean {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.62;
}

/** 生成与 ThemeProvider 自定义强调色一致的一组 CSS 变量。 */
function customAccentStyle(color: string): CSSProperties {
  const foreground = isLightColor(color) ? "oklch(18% 0.02 250)" : "oklch(99% 0.005 240)";
  return {
    "--primary": color,
    "--primary-foreground": foreground,
    "--ring": color,
    "--sidebar-primary": color,
    "--sidebar-primary-foreground": foreground,
    "--accent": `color-mix(in oklab, ${color} 16%, var(--background))`,
    "--accent-foreground": `color-mix(in oklab, ${color} 62%, var(--foreground))`,
    "--sidebar-accent": `color-mix(in oklab, ${color} 18%, var(--background))`,
    "--sidebar-accent-foreground": `color-mix(in oklab, ${color} 62%, var(--foreground))`,
  } as CSSProperties;
}

/**
 * 登录页配色作用域：把服务端配置的表面配色与强调色限制在登录 / 注册页内部，
 * 不修改访客本机保存的外观偏好。
 */
export function AuthThemeScope({
  palette,
  accent,
  customAccent,
  className,
  children,
}: {
  palette: PaletteId;
  accent: AccentId;
  customAccent: string;
  className?: string;
  children: ReactNode;
}) {
  const dark = useResolvedDark();
  const useCustomAccent = accent === "custom" && HEX_PATTERN.test(customAccent);
  return (
    <div
      data-palette={palette}
      data-accent={useCustomAccent ? undefined : accent === "custom" ? "sky" : accent}
      className={cn(dark && "dark", className)}
      style={useCustomAccent ? customAccentStyle(customAccent) : undefined}
    >
      {children}
    </div>
  );
}
