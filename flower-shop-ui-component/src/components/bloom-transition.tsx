"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flower2 } from "lucide-react";

const PETAL_COLORS = [
  "var(--flower-rose)",
  "var(--flower-leaf)",
  "var(--flower-sun)",
  "var(--flower-rose)",
  "var(--primary)",
  "var(--flower-leaf)",
  "var(--flower-sun)",
  "var(--flower-rose)",
  "var(--primary)",
  "var(--flower-leaf)",
];

const EASE_IN_OUT_QUINT: [number, number, number, number] = [0.83, 0, 0.17, 1];

/**
 * 登录成功后的「花开」转场：
 * 1. 毛玻璃白纱覆盖 → 2. 十瓣花从中心绽放 →
 * 3. 深绿圆形涟漪从花心荡开铺满全屏 → 4. 中央浮现白色花标 →
 * 5. 通知父组件跳转（主界面用同色幕布接棒揭开）。
 */
export default function BloomTransition({
  onCovered,
}: {
  onCovered: () => void;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(onCovered, reduced ? 250 : 1460);
    return () => window.clearTimeout(timer);
  }, [onCovered, reduced]);

  return (
    <motion.div
      className="fixed inset-0 z-[70]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.28 }}
      role="status"
      aria-label="登录成功，正在进入花屿"
    >
      {/* frosted veil over the login page */}
      <motion.div
        className="absolute inset-0 bg-background/55"
        style={{ backdropFilter: "blur(16px) saturate(1.1)" }}
      />

      {/* blooming flower */}
      <div className="absolute inset-0 grid place-items-center">
        <motion.svg
          viewBox="0 0 100 100"
          className="h-44 w-44 drop-shadow-lg sm:h-56 sm:w-56"
          initial={{ rotate: -90, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
          }
          aria-hidden
        >
          {PETAL_COLORS.map((color, i) => (
            <g key={i} transform={`rotate(${i * 36} 50 50)`}>
              <motion.path
                d="M50 50 C41 35 39 15 50 7 C61 15 59 35 50 50 Z"
                fill={color}
                fillOpacity={0.9}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        delay: 0.1 + i * 0.05,
                        type: "spring",
                        stiffness: 230,
                        damping: 17,
                      }
                }
                style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
              />
            </g>
          ))}
          <motion.circle
            cx="50"
            cy="50"
            r="7.5"
            fill="var(--flower-sun)"
            stroke="var(--background)"
            strokeWidth="1.4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={
              reduced
                ? { duration: 0 }
                : { delay: 0.58, type: "spring", stiffness: 300, damping: 12 }
            }
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
          />
        </motion.svg>
      </div>

      {/* deep forest wash expanding from the flower's heart */}
      <motion.div
        className="absolute inset-0 bg-bloom"
        initial={
          reduced
            ? { opacity: 0 }
            : { clipPath: "circle(0% at 50% 50%)", opacity: 1 }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : { clipPath: "circle(142% at 50% 50%)", opacity: 1 }
        }
        transition={
          reduced
            ? { duration: 0.15 }
            : { delay: 0.66, duration: 0.85, ease: EASE_IN_OUT_QUINT }
        }
      />

      {/* white flower mark settling on the deep green */}
      <motion.div
        className="absolute inset-0 grid place-items-center"
        initial={{ opacity: 0, scale: 0.7, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={
          reduced
            ? { duration: 0.1 }
            : { delay: 1.02, duration: 0.45, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <Flower2
          className="h-11 w-11 text-[oklch(0.96_0.02_150)]"
          strokeWidth={1.5}
        />
      </motion.div>
    </motion.div>
  );
}
