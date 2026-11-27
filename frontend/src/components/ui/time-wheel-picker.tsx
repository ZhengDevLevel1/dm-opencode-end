import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const DEFAULT_ITEM_HEIGHT = 36;
const DEFAULT_VIEW_HEIGHT = 180;
const EDITORIAL_ITEM_HEIGHT = 44;
const EDITORIAL_VIEW_HEIGHT = 220;
const SCROLL_IDLE_MS = 160;

type TimeWheelVariant = "default" | "editorial";

interface WheelColumnProps {
  options: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  label: string;
  hint?: string;
  showLabel?: boolean;
  variant?: TimeWheelVariant;
}

function WheelColumn({
  options,
  value,
  onChange,
  format,
  label,
  hint,
  showLabel,
  variant = "default",
}: WheelColumnProps) {
  const editorial = variant === "editorial";
  const itemHeight = editorial ? EDITORIAL_ITEM_HEIGHT : DEFAULT_ITEM_HEIGHT;
  const viewHeight = editorial ? EDITORIAL_VIEW_HEIGHT : DEFAULT_VIEW_HEIGHT;
  const padY = (viewHeight - itemHeight) / 2;

  const ref = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<number | null>(null);
  const latest = useRef({ options, value, onChange });
  latest.current = { options, value, onChange };

  const activeIndex = Math.max(0, options.indexOf(value));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const target = activeIndex * itemHeight;
    if (Math.abs(element.scrollTop - target) < itemHeight / 2) return;
    element.scrollTop = target;
  }, [activeIndex, itemHeight, options.length]);

  useEffect(
    () => () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    },
    [],
  );

  const scrollToIndex = (index: number) => {
    const element = ref.current;
    if (!element || index < 0) return;
    const top = index * itemHeight;
    if (Math.abs(element.scrollTop - top) < 1) return;
    element.scrollTop = top;
  };

  const commitScrollPosition = () => {
    idleTimer.current = null;
    const element = ref.current;
    if (!element) return;
    const current = latest.current;
    if (current.options.length === 0) return;
    const index = Math.min(
      current.options.length - 1,
      Math.max(0, Math.round(element.scrollTop / itemHeight)),
    );
    const top = index * itemHeight;
    if (Math.abs(element.scrollTop - top) >= 1) element.scrollTop = top;
    const next = current.options[index];
    if (next !== undefined && next !== current.value) current.onChange(next);
  };

  const handleScroll = () => {
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(commitScrollPosition, SCROLL_IDLE_MS);
  };

  const handleSelect = (option: number) => {
    if (idleTimer.current !== null) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    onChange(option);
    scrollToIndex(options.indexOf(option));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      {showLabel ? (
        <span
          className={
            editorial
              ? "text-[11px] font-medium tracking-[0.24em] text-muted-foreground"
              : "text-[10px] font-medium tracking-[0.24em] text-muted-foreground"
          }
        >
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "relative w-full",
          editorial && "overflow-hidden rounded-xl border border-border/60 bg-card",
        )}
        role="listbox"
        aria-label={label}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-card to-transparent"
          style={{ height: itemHeight * 2 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-card to-transparent"
          style={{ height: itemHeight * 2 }}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-2 top-1/2 z-0 -translate-y-1/2",
            editorial
              ? "rounded-lg border border-primary/30 bg-primary/10"
              : "rounded-lg border border-primary/20 bg-primary/5",
          )}
          style={{ height: itemHeight }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="relative z-[1] scrollbar-none snap-y snap-mandatory overflow-y-auto overscroll-contain"
          style={{ height: viewHeight, paddingTop: padY, paddingBottom: padY }}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => handleSelect(option)}
              className={cn(
                "flex w-full snap-center items-center justify-center font-display lining-nums tabular-nums transition-all",
                editorial ? "text-xl" : "text-[19px]",
                option === value
                  ? "text-foreground font-semibold"
                  : editorial
                    ? "text-muted-foreground/55 hover:text-foreground"
                    : "text-muted-foreground/65 hover:text-foreground",
              )}
              style={{ height: itemHeight }}
            >
              {format(option)}
            </button>
          ))}
        </div>
      </div>
      {hint ? (
        <span
          className={
            editorial
              ? "text-[10.5px] tracking-[0.06em] text-muted-foreground/70"
              : "text-[10px] tracking-wider text-muted-foreground/60"
          }
        >
          {hint}
        </span>
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
  variant?: TimeWheelVariant;
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
  variant = "default",
  className,
}: TimeWheelPickerProps) {
  const editorial = variant === "editorial";

  return (
    <div
      className={cn(
        editorial
          ? "grid grid-cols-2 items-start gap-3 sm:gap-4"
          : "relative flex items-stretch gap-1 rounded-2xl border border-border/60 bg-card px-2 py-1",
        className,
      )}
    >
      <WheelColumn
        variant={variant}
        label={hourLabel}
        hint={hourHint}
        showLabel={showLabels}
        options={hours}
        value={hour}
        onChange={onHourChange}
        format={(value) => String(value).padStart(2, "0")}
      />
      {editorial ? null : (
        <div className="flex items-center pb-1 font-display text-base font-semibold text-muted-foreground">
          :
        </div>
      )}
      <WheelColumn
        variant={variant}
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
