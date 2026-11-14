import type { CSSProperties, ReactNode } from "react";
import { useResolvedDark } from "@/app/providers/theme-provider";
import { cn } from "@/lib/cn";
import { buildCustomAccentVars, HEX_PATTERN } from "@/lib/custom-accent";
import type { AccentId, PaletteId } from "@/stores/theme";

/** 生成与 ThemeProvider 自定义强调色一致的一组 CSS 变量。 */
function customAccentStyle(color: string): CSSProperties {
  return buildCustomAccentVars(color) as CSSProperties;
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
