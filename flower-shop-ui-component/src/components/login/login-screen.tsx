"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Flower2, LogIn, Mail } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";
import BloomTransition from "@/components/bloom-transition";
import Petals from "@/components/petals";
import { ToastProvider, useToast } from "@/components/toast";
import BrandAside from "./brand-aside";
import { CodeForm, PasswordForm, type AuthPhase } from "./forms";

type Tab = "password" | "code";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "password", label: "密码登录", icon: <LogIn className="h-3.5 w-3.5" /> },
  { id: "code", label: "邮箱验证码", icon: <Mail className="h-3.5 w-3.5" /> },
];

function LoginInner() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("password");
  const [phase, setPhase] = useState<AuthPhase>("idle");

  // 预取主界面，让转场结束后的跳转瞬时完成
  useEffect(() => {
    router.prefetch("/home");
  }, [router]);

  const handleSuccess = useCallback(() => {
    setPhase("success");
    window.setTimeout(() => setPhase("blooming"), 460);
  }, []);

  const handleCovered = useCallback(() => {
    router.push("/home");
  }, [router]);

  return (
    <div
      data-palette="everforest-light"
      data-accent="emerald"
      className="relative flex min-h-svh bg-background text-foreground"
    >
      {/* backdrop: soft flower field + slow ken-burns + film grain + drifting petals */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <img
          src="/images/flower-background.jpg"
          alt=""
          className="kenburns h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "var(--background)", opacity: 0.55 }}
        />
        <Petals />
        <div className="grain" />
      </div>

      <BrandAside />

      <main className="relative z-[1] flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <span className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Flower2 className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="text-sm font-semibold">花屿 Bloom Isle</span>
          </span>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-14">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <div className="mb-6">
              <h2 className="font-display text-[1.75rem] font-semibold tracking-tight">
                欢迎回来
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                登录后继续挑选花礼、查看订单与履约进度。
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-6 sm:p-7">
              {/* segmented tabs with gliding pill */}
              <div
                role="tablist"
                aria-label="登录方式"
                className="mb-6 flex rounded-lg bg-muted/60 p-1"
              >
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.id)}
                      className={`relative flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-200 ${
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {active ? (
                        <motion.span
                          layoutId="auth-tab-pill"
                          className="absolute inset-0 rounded-md bg-card shadow-sm ring-1 ring-border/70"
                          transition={{
                            type: "spring",
                            stiffness: 480,
                            damping: 38,
                          }}
                          aria-hidden
                        />
                      ) : null}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {t.icon}
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: tab === "password" ? -14 : 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tab === "password" ? 14 : -14 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {tab === "password" ? (
                    <PasswordForm phase={phase} onSuccess={handleSuccess} />
                  ) : (
                    <CodeForm phase={phase} onSuccess={handleSuccess} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              还没有账号？
              <button
                type="button"
                onClick={() =>
                  toast("演示环境暂不开放自助注册，请使用演示账号登录")
                }
                className="ml-1 cursor-pointer font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                注册消费者账号
              </button>
            </p>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {phase === "blooming" ? (
          <BloomTransition key="bloom" onCovered={handleCovered} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function LoginScreen() {
  return (
    <ToastProvider>
      <LoginInner />
    </ToastProvider>
  );
}
