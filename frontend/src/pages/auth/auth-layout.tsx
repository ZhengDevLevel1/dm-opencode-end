import type { ReactNode } from "react";
import { Flower2, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useResolvedDark } from "@/app/providers/theme-provider";
import { useThemeStore } from "@/stores/theme";
import { runWithThemeTransition, nextThemeMode } from "@/lib/theme-transition";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dark = useResolvedDark();
  const setTheme = useThemeStore((state) => state.set);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden border-r border-border/50 bg-sidebar p-10 lg:flex">
        <div className="relative z-[1]">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Flower2 className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">花屿 Bloom Isle</span>
              <span className="block text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                Floral Studio &amp; Shop
              </span>
            </span>
          </Link>
        </div>

        <div className="relative z-[1] max-w-md">
          <p className="text-[10px] font-medium tracking-[0.2em] text-primary uppercase">
            A quiet flower studio
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
            把当季的花，交到在乎的人手里。
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            从挑选、下单到花艺师接单、备花与配送，每一步都清晰可见。这里没有夸张的营销，
            只有真实的花礼与顺手的经营工具。
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: "当季花礼", value: "9 大品类" },
              { label: "履约节点", value: "4 步可追踪" },
              { label: "推荐依据", value: "透明可解释" },
            ].map((item) => (
              <div key={item.label} className="ui-card px-3 py-3">
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-[1] flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>花屿 · 花艺经营台</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>清澈，但不冷淡</span>
        </div>

        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-flower-rose/10 blur-3xl" />
          <Flower2 className="absolute top-1/3 right-12 h-40 w-40 rotate-12 text-primary/10" strokeWidth={0.8} />
          <Flower2 className="absolute bottom-24 left-16 h-28 w-28 -rotate-12 text-flower-leaf/15" strokeWidth={0.8} />
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Flower2 className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">花屿 Bloom Isle</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? "切换到亮色模式" : "切换到暗色模式"}
            onClick={() =>
              runWithThemeTransition(() => setTheme({ mode: nextThemeMode(dark) }))
            }
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <div className={cn("w-full max-w-md")}>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="ui-card p-6">{children}</div>
            {footer ? <div className="mt-4 text-center text-xs text-muted-foreground">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
