"use client";

import { motion, type Variants } from "framer-motion";
import { Flower2 } from "lucide-react";

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

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Flower2 className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight">
          花屿 Bloom Isle
        </span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Floral Studio &amp; Shop
        </span>
      </span>
    </span>
  );
}

export default function BrandAside() {
  return (
    <aside
      className="relative z-[1] hidden w-[42%] max-w-[620px] flex-col justify-between overflow-hidden border-r border-border/40 p-10 lg:flex xl:p-14"
      style={{
        backgroundColor: "color-mix(in oklab, var(--sidebar) 62%, transparent)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* ambient decorations */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="floaty absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div
          className="floaty absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-flower-rose/10 blur-3xl"
          style={{ animationDelay: "-4.5s" }}
        />
        <div
          className="floaty absolute top-1/3 right-12 text-primary/15"
          style={{ animationDelay: "-2s", animationDuration: "11s" }}
        >
          <Flower2 className="h-40 w-40 rotate-12" strokeWidth={0.8} />
        </div>
        <div
          className="floaty absolute bottom-24 left-14 text-flower-leaf/20"
          style={{ animationDelay: "-6s", animationDuration: "13s" }}
        >
          <Flower2 className="h-28 w-28 -rotate-12" strokeWidth={0.8} />
        </div>
        <div className="absolute top-[18%] left-[8%] h-40 w-40 rounded-full border border-primary/10" />
        <div className="absolute right-[16%] bottom-[22%] h-24 w-24 rounded-full border border-flower-rose/15" />
      </div>

      <motion.div
        className="relative z-[1]"
        variants={GROUP}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={REVEAL}>
          <Logo />
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-[1] max-w-md"
        variants={GROUP}
        initial="hidden"
        animate="show"
      >
        <motion.p
          variants={REVEAL}
          className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary"
        >
          A quiet flower studio
        </motion.p>
        <h1 className="mt-4 font-display text-[2rem] leading-[1.28] font-semibold tracking-tight xl:text-[2.5rem]">
          <span className="block overflow-hidden pb-0.5">
            <motion.span
              className="block"
              initial={{ y: "112%" }}
              animate={{ y: 0 }}
              transition={{
                delay: 0.35,
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              把当季的花，
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-1">
            <motion.span
              className="block"
              initial={{ y: "112%" }}
              animate={{ y: 0 }}
              transition={{
                delay: 0.48,
                duration: 0.9,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              交到在乎的人手里。
            </motion.span>
          </span>
        </h1>
        <motion.p
          variants={REVEAL}
          className="mt-5 text-sm leading-relaxed text-muted-foreground"
        >
          从挑选、下单到花艺师接单、备花与配送，每一步都清晰可见。这里没有夸张的营销，只有真实的花礼与顺手的经营工具。
        </motion.p>
        <div className="mt-9 grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <motion.div
              key={s.label}
              variants={REVEAL}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="ui-card px-3.5 py-3.5"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1.5 text-sm font-semibold">{s.value}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="relative z-[1] flex items-center gap-4 text-[11px] text-muted-foreground"
        variants={GROUP}
        initial="hidden"
        animate="show"
      >
        <motion.span variants={REVEAL}>花屿 · 花艺经营台</motion.span>
        <motion.span
          variants={REVEAL}
          className="h-1 w-1 rounded-full bg-border"
        />
        <motion.span variants={REVEAL}>清澈，但不冷淡</motion.span>
      </motion.div>
    </aside>
  );
}
