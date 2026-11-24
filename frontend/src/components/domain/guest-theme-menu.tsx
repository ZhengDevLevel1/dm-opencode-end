import { Check, Monitor, Moon, Palette, RotateCcw, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { runWithThemeTransition } from "@/lib/theme-transition";
import { themeAccents, themePalettes } from "@/lib/theme-options";
import { useThemeStore, type PaletteId, type ThemeMode } from "@/stores/theme";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

const modes: Array<{ value: ThemeMode; label: string; icon: LucideIcon }> = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
];

export function GuestThemeMenu() {
  const mode = useThemeStore((state) => state.mode);
  const palette = useThemeStore((state) => state.palette);
  const accent = useThemeStore((state) => state.accent);
  const customAccent = useThemeStore((state) => state.customAccent);
  const setTheme = useThemeStore((state) => state.set);
  const reset = useThemeStore((state) => state.reset);

  const handleModeChange = (next: ThemeMode) => {
    if (mode === next) return;
    runWithThemeTransition(() => setTheme({ mode: next }));
  };

  const handlePaletteChange = (next: PaletteId) => {
    if (palette === next) return;
    runWithThemeTransition(() => setTheme({ palette: next }));
  };

  return (
    <DropdownMenu
      triggerLabel="外观设置"
      contentClassName="w-[min(21rem,calc(100vw-1rem))] p-3"
      trigger={
        <span
          title="外观设置"
          className="flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Palette className="h-[18px] w-[18px]" />
        </span>
      }
    >
      <div className="flex items-start justify-between gap-3 px-1 pb-2">
        <div>
          <p className="text-sm font-semibold">外观设置</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">游客偏好只保存在当前浏览器</p>
        </div>
        <button
          type="button"
          aria-label="恢复默认外观"
          title="恢复默认外观"
          onClick={() => runWithThemeTransition(reset)}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <section>
          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">显示模式</p>
          <div className="grid grid-cols-3 gap-1.5">
            {modes.map((item) => {
              const Icon = item.icon;
              const active = mode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleModeChange(item.value)}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] transition-colors",
                    active
                      ? "border-primary/40 bg-primary/[0.06] text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">表面配色</p>
          <div className="grid grid-cols-2 gap-1.5">
            {themePalettes.map((item) => {
              const active = palette === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handlePaletteChange(item.value)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                    active
                      ? "border-primary/40 bg-primary/[0.04]"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span
                    className="flex h-8 w-10 shrink-0 items-end gap-1 rounded-md p-1 ring-1 ring-black/5"
                    style={{ background: item.background }}
                  >
                    <span
                      className="h-4 w-2.5 rounded-sm shadow-sm"
                      style={{ background: item.surface }}
                    />
                    <span
                      className="h-6 w-2.5 rounded-sm shadow-sm"
                      style={{ background: item.primary }}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                    {item.label}
                  </span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-1.5 px-1 text-[11px] font-medium text-muted-foreground">强调色</p>
          <div className="flex flex-wrap gap-1.5">
            {themeAccents.map((item) => {
              const active = accent === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme({ accent: item.value })}
                  className={cn(
                    "flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors",
                    active
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </button>
              );
            })}
            <label
              className={cn(
                "relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors",
                accent === "custom"
                  ? "border-primary/40 bg-primary/[0.06]"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <span
                className="h-3.5 w-3.5 rounded-full ring-1 ring-border"
                style={{ background: customAccent }}
              />
              自定义
              <input
                type="color"
                value={customAccent}
                aria-label="自定义强调色"
                onChange={(event) => setTheme({ accent: "custom", customAccent: event.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </section>
      </div>
    </DropdownMenu>
  );
}
