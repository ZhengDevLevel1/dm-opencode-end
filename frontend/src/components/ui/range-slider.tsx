import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/cn";

type RangeSliderProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value" | "onChange"
> & {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  ...props
}: RangeSliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const reportedRef = useRef(value);

  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const progress = Math.min(100, Math.max(0, percent));

  // 输入框采用非受控模式：拖拽期间 DOM 的滑块位置完全跟随指针，
  // React 重渲染不会把滑块“拽回”旧值，避免一卡一卡的抖动。
  useEffect(() => {
    const input = inputRef.current;
    if (!input || draggingRef.current) return;
    const current = Number(input.value);
    if (!Number.isNaN(current) && current !== value) input.value = String(value);
    reportedRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const flush = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending !== null && pending !== reportedRef.current) {
      reportedRef.current = pending;
      onChange(pending);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    pendingRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending !== null && pending !== reportedRef.current) {
        reportedRef.current = pending;
        onChange(pending);
      }
    });
  };

  return (
    <input
      {...props}
      ref={inputRef}
      type="range"
      min={min}
      max={max}
      step={step}
      defaultValue={value}
      onPointerDown={() => {
        draggingRef.current = true;
      }}
      onPointerUp={() => {
        draggingRef.current = false;
        flush();
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
        pendingRef.current = null;
      }}
      onChange={handleChange}
      className={cn("ui-range", className)}
      style={{ "--range-progress": `${progress}%` } as CSSProperties}
    />
  );
}