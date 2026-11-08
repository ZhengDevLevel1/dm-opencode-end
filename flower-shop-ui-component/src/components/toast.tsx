"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type ToastKind = "info" | "success" | "error";
type ToastItem = { id: number; text: string; kind: ToastKind };

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(
  () => undefined,
);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastKind, ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-primary" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((text: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-2), { id, text, kind }]);
    window.setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      3800,
    );
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="glass-panel flex max-w-full items-center gap-2 rounded-full px-4 py-2.5 text-xs text-foreground"
            >
              <span className="shrink-0">{ICONS[t.kind]}</span>
              <span className="truncate">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
