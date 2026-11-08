"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Flower2, Loader2, LogOut } from "lucide-react";
import Petals from "@/components/petals";

const GLYPHS = ["花", "开", "了", "。"];

/**
 * 主界面——只有一行字。
 * 进场时由与登录转场同色的深绿幕布向上揭开，
 * 与登录页的花开转场无缝接棒。
 */
export default function HomeScreen({ name }: { name: string }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    if (leaving) return;
    setLeaving(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background"
      aria-label={`欢迎回来，${name}`}
    >
      <div className="absolute inset-0" aria-hidden>
        <Petals count={8} />
        <div className="grain" />
      </div>

      {/* the single line */}
      <main className="relative z-[1] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduced
              ? { duration: 0 }
              : { delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
          }
          className="mx-auto mb-8 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
          aria-hidden
        >
          <Flower2 className="h-7 w-7" strokeWidth={1.6} />
        </motion.div>

        <h1
          className="font-display text-[clamp(3.5rem,14vw,9rem)] leading-none font-semibold tracking-tight"
          aria-label="花开了。"
        >
          {GLYPHS.map((glyph, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 64, filter: "blur(16px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      delay: 0.85 + i * 0.17,
                      duration: 0.95,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
            >
              {glyph}
            </motion.span>
          ))}
        </h1>

        <motion.div
          className="hairline mx-auto mt-12"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 148, opacity: 1 }}
          transition={
            reduced
              ? { duration: 0 }
              : { delay: 1.8, duration: 0.9, ease: [0.22, 1, 0.36, 1] }
          }
          aria-hidden
        />
      </main>

      {/* icon-only sign out */}
      <motion.button
        type="button"
        onClick={logout}
        aria-label="退出登录"
        title="退出登录"
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 1 : 0.85 }}
        transition={{ delay: reduced ? 0 : 2.1, duration: 0.5 }}
        className="absolute right-6 bottom-6 z-[2] grid h-10 w-10 cursor-pointer place-items-center rounded-full text-muted-foreground transition-[background-color,color,scale] duration-150 hover:bg-accent hover:text-foreground active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {leaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
      </motion.button>

      {/* deep-green curtain handed off from the login bloom transition */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-bloom"
        initial={{ y: 0 }}
        animate={{ y: "-103%" }}
        transition={
          reduced
            ? { duration: 0.2 }
            : { delay: 0.3, duration: 1.05, ease: [0.83, 0, 0.17, 1] }
        }
        aria-hidden
      >
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0.72 }}
          transition={{
            delay: reduced ? 0 : 0.08,
            duration: 0.32,
            ease: "easeIn",
          }}
        >
          <Flower2
            className="h-11 w-11 text-[oklch(0.96_0.02_150)]"
            strokeWidth={1.5}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
