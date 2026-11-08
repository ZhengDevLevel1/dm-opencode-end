import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flower2 } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useThemeStore } from "@/stores/theme";

const PETAL_COLORS = [
  "var(--flower-rose)",
  "var(--flower-leaf)",
  "var(--flower-amber)",
  "var(--flower-rose)",
  "var(--primary)",
  "var(--flower-leaf)",
  "var(--flower-amber)",
  "var(--flower-rose)",
  "var(--primary)",
  "var(--flower-leaf)",
];

const EASE_IN_OUT_QUINT: [number, number, number, number] = [0.83, 0, 0.17, 1];

type BloomTransitionOptions = {
  /** 在幕布遮住页面的瞬间执行，通常用于跳转路由。 */
  run?: () => void | Promise<void>;
  /** 整段转场结束（幕布完全揭开）后执行。 */
  onComplete?: () => void;
};

type BloomTransitionContextValue = {
  /** 返回是否成功启动转场；已有转场进行中时返回 false，调用方可直接跳转兜底。 */
  play: (options?: BloomTransitionOptions) => boolean;
};

const BloomTransitionContext = createContext<BloomTransitionContextValue | null>(null);

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

export function BloomTransitionProvider({ children }: { children: ReactNode }) {
  const systemReducedMotion = useReducedMotion();
  const reduceMotionSetting = useThemeStore((state) => state.reduceMotion);
  const reduced = Boolean(systemReducedMotion || reduceMotionSetting);
  const [active, setActive] = useState(false);
  const [lifting, setLifting] = useState(false);
  const runningRef = useRef(false);

  useEffect(
    () => () => document.documentElement.classList.remove("bloom-transition-active"),
    [],
  );

  const play = useCallback(
    (options: BloomTransitionOptions = {}) => {
      if (runningRef.current) return false;
      runningRef.current = true;
      setActive(true);
      setLifting(false);
      // 冻结登录页的背景动画，避免遮罩期间全屏图层持续重绘。
      document.documentElement.classList.add("bloom-transition-active");

      void (async () => {
        // 完整播放花绽开和深绿铺满的动画（约 1.5s），此时页面已被完全遮住。
        await wait(reduced ? 200 : 1500);
        try {
          await options.run?.();
        } catch {
          /* 路由或登出失败不阻塞转场，由调用方负责提示 */
        }

        // 幕布保持不动，等待目标页面挂载并完成首屏渲染后再揭开。
        await nextFrame();
        await nextFrame();
        await wait(reduced ? 80 : 520);

        setLifting(true);
        await wait(reduced ? 180 : 980);

        setActive(false);
        setLifting(false);
        runningRef.current = false;
        document.documentElement.classList.remove("bloom-transition-active");
        options.onComplete?.();
      })();
      return true;
    },
    [reduced],
  );

  return (
    <BloomTransitionContext.Provider value={{ play }}>
      {children}
      <AnimatePresence>
        {active ? (
          <BloomOverlay key="bloom-transition" lifting={lifting} reduced={reduced} />
        ) : null}
      </AnimatePresence>
    </BloomTransitionContext.Provider>
  );
}

export function useBloomTransition() {
  const context = useContext(BloomTransitionContext);
  if (!context) {
    throw new Error("useBloomTransition must be used within BloomTransitionProvider");
  }
  return context;
}

function BloomOverlay({ lifting, reduced }: { lifting: boolean; reduced: boolean }) {
  return (
    <motion.div
      className="fixed inset-0 z-[300] overflow-hidden"
      style={{ willChange: "transform" }}
      initial={{ y: 0 }}
      animate={{ y: lifting ? "-103%" : 0 }}
      transition={
        reduced
          ? { duration: 0.18, ease: "easeOut" }
          : { duration: 0.98, ease: EASE_IN_OUT_QUINT }
      }
      role="status"
      aria-label="正在进入花屿"
    >
      {/* 用半透明纯色替代全屏 backdrop-filter，避免转场时逐帧重算背景模糊 */}
      <motion.div
        className="absolute inset-0 bg-background/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.26 }}
      />

      <div className="absolute inset-0 grid place-items-center">
        <motion.svg
          viewBox="0 0 100 100"
          className="h-44 w-44 sm:h-56 sm:w-56"
          style={{ willChange: "transform" }}
          initial={{ rotate: -90, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={
            reduced ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
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
            fill="var(--flower-amber)"
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

      {/* 用 transform 缩放的大圆替代 clip-path，交给合成层处理，避免全屏重绘 */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <motion.div
          className="shrink-0 rounded-full bg-bloom"
          style={{ width: "130vmax", height: "130vmax", willChange: "transform" }}
          initial={reduced ? { scale: 1, opacity: 0 } : { scale: 0, opacity: 1 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { delay: 0.66, duration: 0.85, ease: EASE_IN_OUT_QUINT }
          }
        />
      </div>

      <motion.div
        className="absolute inset-0 grid place-items-center"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={lifting ? { opacity: 0, scale: 0.72 } : { opacity: 1, scale: 1 }}
        transition={
          lifting
            ? { duration: reduced ? 0.08 : 0.3, ease: "easeIn" }
            : reduced
              ? { duration: 0.1 }
              : { delay: 1.02, duration: 0.45, ease: [0.22, 1, 0.36, 1] }
        }
        aria-hidden
      >
        <Flower2 className="h-11 w-11 text-[oklch(0.96_0.02_150)]" strokeWidth={1.5} />
      </motion.div>
    </motion.div>
  );
}
