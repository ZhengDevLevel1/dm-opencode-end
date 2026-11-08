import { useState, type ReactNode } from "react";
import { Flower2, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useResolvedDark } from "@/app/providers/theme-provider";
import { useThemeStore } from "@/stores/theme";
import { runWithThemeTransition, nextThemeMode } from "@/lib/theme-transition";
import { useAuthBackgroundQuery } from "@/hooks/queries";
import { resolveImageUrl } from "@/lib/image";
import { AUTH_GRADIENT_BACKGROUND } from "@/lib/auth-background";
import { Button } from "@/components/ui/button";
import { AuthThemeScope } from "@/components/domain/auth-theme-scope";
import { AuthPetals } from "@/components/domain/auth-petals";

const STATS = [
  { label: "当季花礼", value: "9 大品类" },
  { label: "履约节点", value: "4 步可追踪" },
  { label: "推荐依据", value: "透明可解释" },
];

const REVEAL: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

const GROUP: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

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
  const systemReducedMotion = useReducedMotion();
  const reduceMotionSetting = useThemeStore((state) => state.reduceMotion);
  const reduced = Boolean(systemReducedMotion || reduceMotionSetting);
  const setTheme = useThemeStore((state) => state.set);
  const { data: authBackground } = useAuthBackgroundQuery();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const resolvedImage = resolveImageUrl(authBackground?.imageUrl);
  const backgroundImage = resolvedImage && resolvedImage !== failedUrl ? resolvedImage : null;
  const backgroundType = (
    authBackground?.backgroundType ?? (authBackground?.imageUrl ? "IMAGE" : "NONE")
  ).toUpperCase();
  const showGradient = backgroundType === "GRADIENT";
  const showImage = backgroundType === "IMAGE" && Boolean(backgroundImage);
  const hasBackdrop = showGradient || showImage;
  const maskOpacity = authBackground?.backgroundOpacity ?? 0.78;
  const blur = authBackground?.backgroundBlur ?? 0;
  const surfaceOpacity = authBackground?.componentOpacity ?? 1;
  const surfacePercent = Math.round(surfaceOpacity * 100);

  return (
    <AuthThemeScope
      palette={authBackground?.palette ?? "default"}
      accent={authBackground?.accent ?? "sky"}
      customAccent={authBackground?.customAccent ?? "#38bdf8"}
      className="relative flex min-h-screen bg-background"
    >
      {/* 背景：管理端配置的图片 / 渐变，未配置时使用品牌色环境光 */}
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {showGradient ? (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: AUTH_GRADIENT_BACKGROUND }}
          />
        ) : null}
        {showImage ? (
          <>
            <img
              src={backgroundImage ?? undefined}
              alt=""
              className="kenburns h-full w-full object-cover"
              style={{ filter: `blur(${blur}px)` }}
              onError={() => setFailedUrl(backgroundImage)}
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "var(--background)", opacity: maskOpacity }}
            />
          </>
        ) : null}
        {!hasBackdrop ? (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 120% at 10% 0%, color-mix(in oklab, var(--flower-rose) 14%, transparent), transparent 55%), radial-gradient(100% 100% at 100% 100%, color-mix(in oklab, var(--flower-leaf) 13%, transparent), transparent 58%), linear-gradient(160deg, color-mix(in oklab, var(--primary) 5%, var(--background)), var(--background))",
            }}
          />
        ) : null}
      </div>

      <AuthPetals className="z-[1]" />
      <div className="grain fixed inset-0 z-[1]" aria-hidden />

      <aside className="relative z-[2] hidden w-[42%] max-w-[620px] flex-col justify-between p-10 lg:flex xl:p-14">
        <motion.div
          className="relative z-[1]"
          variants={GROUP}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <motion.div variants={REVEAL}>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Flower2 className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-tight">
                  花屿 Bloom Isle
                </span>
                <span className="block text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                  Floral Studio &amp; Shop
                </span>
              </span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative z-[1] max-w-md"
          variants={GROUP}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <motion.p
            variants={REVEAL}
            className="text-[10px] font-medium tracking-[0.22em] text-primary uppercase"
          >
            A quiet flower studio
          </motion.p>
          <h1 className="mt-4 font-display text-[2rem] leading-[1.28] font-semibold tracking-tight xl:text-[2.5rem]">
            <span className="block overflow-hidden pb-0.5">
              <motion.span
                className="block"
                initial={reduced ? false : { y: "112%" }}
                animate={{ y: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }
                }
              >
                把当季的花，
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-1">
              <motion.span
                className="block"
                initial={reduced ? false : { y: "112%" }}
                animate={{ y: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { delay: 0.48, duration: 0.9, ease: [0.22, 1, 0.36, 1] }
                }
              >
                交到在乎的人手里。
              </motion.span>
            </span>
          </h1>
          <motion.p
            variants={REVEAL}
            className="mt-5 text-sm leading-relaxed text-muted-foreground"
          >
            从挑选、下单到花艺师接单、备花与配送，每一步都清晰可见。
            这里没有夸张的营销，只有真实的花礼与顺手的经营工具。
          </motion.p>
          <div className="mt-9 grid grid-cols-3 gap-3">
            {STATS.map((item) => (
              <motion.div
                key={item.label}
                variants={REVEAL}
                whileHover={reduced ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
                className="ui-card px-3.5 py-3.5"
              >
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  {item.label}
                </p>
                <p className="mt-1.5 text-sm font-semibold">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative z-[1] flex items-center gap-4 text-[11px] text-muted-foreground"
          variants={GROUP}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <motion.span variants={REVEAL}>花屿 · 花艺经营台</motion.span>
          <motion.span variants={REVEAL} className="h-1 w-1 rounded-full bg-border" />
          <motion.span variants={REVEAL}>清澈，但不冷淡</motion.span>
        </motion.div>
      </aside>

      <main className="relative z-[2] flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Flower2 className="h-4 w-4" strokeWidth={1.8} />
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

        <div className="flex flex-1 items-center justify-center px-5 pb-14">
          <motion.div
            className="w-full max-w-md"
            initial={reduced ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <div className="mb-6">
              <h2 className="font-display text-[1.75rem] font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            </div>
            <div
              className="glass-panel rounded-2xl p-6 sm:p-7"
              style={{
                backgroundColor: `color-mix(in oklab, var(--card) ${surfacePercent}%, transparent)`,
              }}
            >
              {children}
            </div>
            {footer ? (
              <div className="mt-5 text-center text-xs text-muted-foreground">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      </main>
    </AuthThemeScope>
  );
}
