import { useLayoutEffect, useRef } from "react";
import { cn } from "@/utils/cn";

const ITEM_H = 36;
const VIEW_H = 180;
const PAD = (VIEW_H - ITEM_H) / 2;

export const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 09 – 20
export const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type WheelProps = {
  label: string;
  hint: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  disabled?: (v: number) => boolean;
};

function Wheel({ label, hint, options, value, onChange, disabled }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.max(0, options.indexOf(value));
    el.scrollTo({ top: idx * ITEM_H, behavior: first.current ? "auto" : "smooth" });
    first.current = false;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, options]);

  /* Once the list settles, adopt whatever landed in the centre band —
     or snap back if the user parked on a disabled value. */
  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const picked = options[Math.max(0, Math.min(options.length - 1, idx))];
      if (picked === undefined || picked === value) return;
      if (disabled?.(picked)) {
        el.scrollTo({ top: options.indexOf(value) * ITEM_H, behavior: "smooth" });
        return;
      }
      onChange(picked);
    }, 130);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span className="font-display text-[11px] tracking-[0.3em] text-moss-500">{label}</span>

      <div className="relative w-full overflow-hidden rounded-xl border border-cream-200 bg-white">
        {/* centre band sits BEHIND the list (z-auto) so the digits stay readable on top of it */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-blush-50 ring-1 ring-inset ring-blush-200/70" />

        <div
          ref={ref}
          onScroll={handleScroll}
          className="no-scrollbar relative z-10 h-[180px] overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label={`${label}，${hint}`}
        >
          <div style={{ height: PAD }} />
          {options.map((o) => {
            const isOff = disabled?.(o) ?? false;
            const on = o === value;
            return (
              <button
                key={o}
                role="option"
                aria-selected={on}
                disabled={isOff}
                onClick={() => onChange(o)}
                className={cn(
                  "flex w-full items-center justify-center font-display text-[19px] lining-nums tabular-nums transition-colors duration-150",
                  on
                    ? "font-semibold text-moss-900"
                    : isOff
                      ? "cursor-not-allowed text-moss-500/25"
                      : "text-moss-500/55 hover:text-moss-800",
                )}
                style={{ height: ITEM_H }}
              >
                {String(o).padStart(2, "0")}
              </button>
            );
          })}
          <div style={{ height: PAD }} />
        </div>

        {/* edge fades sit ON TOP of the list (z-20) to soften the scroll edges */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-7 bg-gradient-to-b from-white via-white/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-7 bg-gradient-to-t from-white via-white/70 to-transparent" />
      </div>

      <span className="h-3 text-[10px] tracking-wider text-moss-500/60">{hint}</span>
    </div>
  );
}

export type TimeValue = { h: number; m: number };

export default function TimePicker({
  value,
  onChange,
}: {
  value: TimeValue;
  onChange: (t: TimeValue) => void;
}) {
  const atClosing = value.h === 20;

  const setH = (h: number) => onChange({ h, m: h === 20 ? 0 : value.m });
  const setM = (m: number) => onChange({ ...value, m });

  return (
    <div className="flex gap-3">
      <Wheel label="时" hint="09 – 20" options={HOURS} value={value.h} onChange={setH} />
      <Wheel
        label="分"
        hint={atClosing ? "封板 00" : "00 – 59"}
        options={MINUTES}
        value={value.m}
        onChange={setM}
        disabled={(v) => atClosing && v !== 0}
      />
    </div>
  );
}
