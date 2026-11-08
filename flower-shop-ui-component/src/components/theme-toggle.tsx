"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !(dark ?? false);
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("bloom-theme", next ? "dark" : "light");
    } catch {
      /* noop */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "切换到浅色模式" : "切换到暗色模式"}
      className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-foreground/80 transition-[background-color,color,scale] duration-150 hover:bg-accent hover:text-foreground active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      {dark === null ? (
        <span className="block h-4 w-4" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={dark ? "sun" : "moon"}
            initial={{ rotate: -70, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 70, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="grid place-items-center"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );
}
