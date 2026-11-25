import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const ITEM_HEIGHT = 36;
const VIEW_HEIGHT = 180;

interface WheelColumnProps {
  options: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  label: string;
  hint?: string;
  showLabel?: boolean;
}

function WheelColumn({
  options,
  value,
  onChange,
  format,
  label,
  hint,
  showLabel,
}: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, options.indexOf(value));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollTo({ top: activeIndex * ITEM_HEIGHT, behavior: "auto" });
  }, [activeIndex, options.length]);

  const handleScroll = () => {
    const element = ref.current;
    if (!element) return;
    const index = Math.min(
      options.length - 1,
      Math.max(0, Math.round(element.scrollTop / ITEM_HEIGHT)),
    );
    const next = options[index];
    if (next !== undefined && next !== value) onChange(next);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      {showLabel ? (
        <span className="text-[10px] font-medium tracking-[0.24em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="relative w-full" role="listbox" aria-label={label}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[72px] bg-gradient-to-b from-card to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[72px] bg-gradient-to-t from-card to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-9 -translate-y-1/2 rounded-lg border border-primary/20 bg-primary/5"
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="snap-y snap-mandatory overflow-y-auto overscroll-contain py-[72px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ height: VIEW_HEIGHT }}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => onChange(option)}
              className={cn(
                "flex h-9 w-full snap-center items-center justify-center font-display text-[19px] lining-nums tabular-nums transition-all",
                option === value
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground/65 hover:text-foreground",
              )}
            >
              {format(option)}
            </button>
          ))}
        </div>
      </div>
      {hint ? (
        <span className="text-[10px] tracking-wider text-muted-foreground/60">{hint}</span>
      ) : null}
    </div>
  );
}

interface TimeWheelPickerProps {
  hour: number;
  minute: number;
  hours: number[];
  minutes: number[];
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  hourLabel?: string;
  minuteLabel?: string;
  hourHint?: string;
  minuteHint?: string;
  showLabels?: boolean;
  className?: string;
}

export function TimeWheelPicker({
  hour,
  minute,
  hours,
  minutes,
  onHourChange,
  onMinuteChange,
  hourLabel = "小时",
  minuteLabel = "分钟",
  hourHint,
  minuteHint,
  showLabels = false,
  className,
}: TimeWheelPickerProps) {
  return (
    <div
      className={cn(
        "relative flex items-stretch gap-1 rounded-2xl border border-border/60 bg-card px-2 py-1",
        className,
      )}
    >
      <WheelColumn
        label={hourLabel}
        hint={hourHint}
        showLabel={showLabels}
        options={hours}
        value={hour}
        onChange={onHourChange}
        format={(value) => String(value).padStart(2, "0")}
      />
      <div className="flex items-center pb-1 font-display text-base font-semibold text-muted-foreground">
        :
      </div>
      <WheelColumn
        label={minuteLabel}
        hint={minuteHint}
        showLabel={showLabels}
        options={minutes}
        value={minute}
        onChange={onMinuteChange}
        format={(value) => String(value).padStart(2, "0")}
      />
    </div>
  );
}
