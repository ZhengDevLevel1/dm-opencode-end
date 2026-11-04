import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "@/lib/cn";

type RangeSliderProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "value" | "onChange" | "min" | "max" | "step"
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
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const progress = Math.min(100, Math.max(0, percent));

  return (
    <input
      {...props}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className={cn("ui-range", className)}
      style={{ "--range-progress": `${progress}%` } as CSSProperties}
    />
  );
}
