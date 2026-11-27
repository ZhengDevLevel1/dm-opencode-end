import { useEffect, useMemo, useState } from "react";
import { Clock3, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  WEEKDAY_OPTIONS,
  addDays,
  businessHourFor,
  deliverySlotOptions,
  formatDateKey,
  isoDayOfWeek,
  timeToMinutes,
} from "@/lib/business-hours";
import type { BusinessHourVO } from "@/types/api";
import { TimeWheelPicker } from "@/components/ui/time-wheel-picker";

interface DeliverySelection {
  date: string;
  time: string;
}

interface DeliveryTimePickerProps {
  value: DeliverySelection;
  hours: BusinessHourVO[];
  onChange: (value: DeliverySelection) => void;
  now?: Date;
  className?: string;
  variant?: "default" | "editorial";
  hideDateHeading?: boolean;
}

const DAY_OPTIONS = 6;
const SLOT_STEP_MINUTES = 1;
const QUICK_SLOT_ANCHORS = [
  { minute: 9 * 60, label: "开门单" },
  { minute: 12 * 60, label: "午间" },
  { minute: 15 * 60, label: "下午" },
  { minute: 18 * 60, label: "下班惊喜" },
];

function dateLabel(date: Date, offset: number): string {
  if (offset === 0) return "今天";
  if (offset === 1) return "明日";
  if (offset === 2) return "后天";
  return WEEKDAY_OPTIONS[isoDayOfWeek(date) - 1]?.label ?? "";
}

function weekdayDateLabel(date: Date, offset: number): string {
  const weekday = WEEKDAY_OPTIONS[isoDayOfWeek(date) - 1]?.label ?? "";
  const relative = offset === 0 ? "今天" : offset === 1 ? "明天" : offset === 2 ? "后天" : "";
  const datePart = `${date.getDate()}·${weekday}`;
  return relative ? `${relative}·${datePart}` : datePart;
}

function minutesOf(time: string): number {
  return timeToMinutes(time);
}

export function DeliveryTimePicker({
  value,
  hours,
  onChange,
  now,
  className,
  variant = "default",
  hideDateHeading = false,
}: DeliveryTimePickerProps) {
  const editorial = variant === "editorial";
  const [fallbackNow] = useState(() => new Date());
  const referenceNow = now ?? fallbackNow;
  const days = useMemo(
    () =>
      Array.from({ length: DAY_OPTIONS }, (_, offset) => {
        const date = addDays(referenceNow, offset);
        const key = formatDateKey(date);
        const slots = deliverySlotOptions(key, hours, referenceNow, SLOT_STEP_MINUTES);
        return { date, key, offset, slots };
      }),
    [hours, referenceNow],
  );

  const selectedDay = days.find((day) => day.key === value.date) ?? days[0];
  const slotOptions = useMemo(() => selectedDay?.slots ?? [], [selectedDay]);
  const currentTime =
    value.time && slotOptions.includes(value.time) ? value.time : (slotOptions[0] ?? "");
  const selectedHour = currentTime ? Math.floor(minutesOf(currentTime) / 60) : null;
  const selectedMinute = currentTime ? minutesOf(currentTime) % 60 : null;
  const hourOptions = useMemo(
    () => Array.from(new Set(slotOptions.map((slot) => Math.floor(minutesOf(slot) / 60)))),
    [slotOptions],
  );
  const minuteOptions = useMemo(
    () =>
      selectedHour === null
        ? []
        : Array.from(
            new Set(
              slotOptions
                .filter((slot) => Math.floor(minutesOf(slot) / 60) === selectedHour)
                .map((slot) => minutesOf(slot) % 60),
            ),
          ),
    [selectedHour, slotOptions],
  );

  useEffect(() => {
    if (!selectedDay || !currentTime) return;
    if (value.date === selectedDay.key && value.time === currentTime) return;
    onChange({ date: selectedDay.key, time: currentTime });
  }, [currentTime, onChange, selectedDay, value.date, value.time]);

  const businessHour = selectedDay ? businessHourFor(selectedDay.date, hours) : null;
  const hourHint = hourOptions.length
    ? `${String(hourOptions[0]).padStart(2, "0")} – ${String(hourOptions[hourOptions.length - 1]).padStart(2, "0")}`
    : undefined;
  const minuteHint = minuteOptions.length
    ? `${String(minuteOptions[0]).padStart(2, "0")} – ${String(minuteOptions[minuteOptions.length - 1]).padStart(2, "0")}`
    : undefined;
  const quickSlots = useMemo(() => {
    if (slotOptions.length === 0) return [];
    const seen = new Set<string>();
    const picks: { time: string; label: string }[] = [];
    for (const anchor of QUICK_SLOT_ANCHORS) {
      let best = slotOptions[0];
      let bestDiff = Number.POSITIVE_INFINITY;
      for (const slot of slotOptions) {
        const diff = Math.abs(minutesOf(slot) - anchor.minute);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = slot;
        }
      }
      if (seen.has(best)) continue;
      seen.add(best);
      picks.push({ time: best, label: anchor.label });
    }
    return picks;
  }, [slotOptions]);

  const handleDate = (day: (typeof days)[number]) => {
    if (day.slots.length === 0) return;
    onChange({ date: day.key, time: day.slots[0] });
  };

  const handleHour = (hour: number) => {
    const candidates = slotOptions.filter((slot) => Math.floor(minutesOf(slot) / 60) === hour);
    if (candidates.length === 0) return;
    const targetMinute = selectedMinute ?? minutesOf(candidates[0]) % 60;
    const next = candidates.reduce((best, slot) => {
      const diff = Math.abs((minutesOf(slot) % 60) - targetMinute);
      const bestDiff = Math.abs((minutesOf(best) % 60) - targetMinute);
      return diff < bestDiff ? slot : best;
    });
    onChange({ date: selectedDay?.key ?? value.date, time: next });
  };

  const handleMinute = (minute: number) => {
    if (selectedHour === null) return;
    const next = `${String(selectedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    if (slotOptions.includes(next)) {
      onChange({ date: selectedDay?.key ?? value.date, time: next });
    }
  };

  const dateGrid = (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {days.map((day) => {
        const active = day.key === selectedDay?.key;
        const soldOut = day.slots.length === 0;
        return (
          <button
            key={day.key}
            type="button"
            disabled={soldOut}
            onClick={() => handleDate(day)}
            className={cn(
              "flex min-h-[66px] flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-all",
              editorial
                ? active
                  ? "border-primary-solid bg-primary-solid text-primary-solid-foreground shadow-sm ring-1 ring-primary-solid/20"
                  : "border-border/60 bg-card text-foreground hover:border-primary/40 hover:bg-muted/30"
                : active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-card hover:border-primary/45 hover:bg-muted/40",
              soldOut && "cursor-not-allowed opacity-45 hover:border-border/70 hover:bg-card",
            )}
          >
            {editorial ? (
              <>
                <span
                  className={cn(
                    "font-display text-[10px] tracking-[0.12em]",
                    active ? "text-primary-solid-foreground/75" : "text-flower-rose",
                  )}
                >
                  {!soldOut && day.offset === 0 ? "3 小时达" : `${day.date.getMonth() + 1}月`}
                </span>
                <span className="mt-0.5 whitespace-nowrap text-[13px] font-medium">
                  {weekdayDateLabel(day.date, day.offset)}
                </span>
                <span
                  className={cn(
                    "mt-0.5 font-display text-[11px]",
                    active ? "text-primary-solid-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {soldOut ? "约满" : "可预约"}
                </span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    "text-[11px]",
                    active ? "text-primary-foreground/75" : "text-muted-foreground",
                  )}
                >
                  {day.offset === 0 ? "今天" : dateLabel(day.date, day.offset)}
                </span>
                <span className="mt-0.5 text-sm font-semibold tabular">
                  {day.date.getMonth() + 1}月{day.date.getDate()}日
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-[10px]",
                    active ? "text-primary-foreground/70" : "text-muted-foreground/70",
                  )}
                >
                  {soldOut ? "约满" : "可预约"}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );

  if (editorial) {
    return (
      <div className={cn("space-y-4", className)}>
        <div>
          {hideDateHeading ? null : (
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Truck className="h-4 w-4 text-flower-rose" />
                选择送达日期
              </span>
              <span className="text-[11px] text-muted-foreground">最多可预约 6 天内</span>
            </div>
          )}
          {dateGrid}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flower-rose/10 text-flower-rose">
                <Clock3 className="h-4 w-4" />
              </span>
              <div>
                <span className="text-[15px] font-medium">选择送达时间</span>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  按分钟预约 · 建议提前 1 小时下单
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 pt-1 text-[11px] text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {businessHour
                ? `营业时间 ${businessHour.openTime} – ${businessHour.closeTime}`
                : "请选择营业日"}
            </span>
          </div>

          {slotOptions.length > 0 ? (
            <>
              <div className="mt-3 flex items-baseline gap-1 font-display text-[36px] leading-none font-semibold tracking-tight tabular sm:text-[40px]">
                <span>{currentTime ? currentTime.slice(0, 2) : "--"}</span>
                <span className="text-primary">:</span>
                <span>{currentTime ? currentTime.slice(3, 5) : "--"}</span>
              </div>
              <TimeWheelPicker
                variant="editorial"
                className="mt-4"
                hour={selectedHour ?? hourOptions[0] ?? 0}
                minute={selectedMinute ?? minuteOptions[0] ?? 0}
                hours={hourOptions}
                minutes={minuteOptions}
                onHourChange={handleHour}
                onMinuteChange={handleMinute}
                hourLabel="时"
                minuteLabel="分"
                hourHint={hourHint}
                minuteHint={minuteHint}
                showLabels
              />
              <div className="mt-4 border-t border-border/50 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] tracking-[0.16em] text-muted-foreground">
                    常用时刻
                  </span>
                  {quickSlots.map((slot) => {
                    const active = slot.time === currentTime;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() =>
                          onChange({ date: selectedDay?.key ?? value.date, time: slot.time })
                        }
                        className={cn(
                          "inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/20 hover:border-primary/35",
                        )}
                      >
                        <span
                          className={cn(
                            "font-display tabular",
                            active ? "text-primary" : "text-foreground",
                          )}
                        >
                          {slot.time}
                        </span>
                        <span
                          className={cn(
                            "text-[10px]",
                            active ? "text-primary/70" : "text-muted-foreground",
                          )}
                        >
                          {slot.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
                花艺师会在所选时间前 30 分钟完成打包；若该时刻已被约满，我们会提前 1
                小时电话与你改约。
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
              当天已无可预约时段，请选择其他日期
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        {hideDateHeading ? null : (
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4 text-flower-rose" />
              选择送达日期
            </span>
            <span className="text-[11px] text-muted-foreground">最多可预约 6 天内</span>
          </div>
        )}
        {dateGrid}
      </div>

      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4 text-flower-rose" />
            选择送达时间
          </span>
          <span className="text-[11px] text-muted-foreground">
            {businessHour
              ? `营业时间 ${businessHour.openTime} – ${businessHour.closeTime} · 至少提前 1 小时`
              : "请选择营业日"}
          </span>
        </div>

        {slotOptions.length > 0 ? (
          <>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-baseline gap-1 font-display text-[42px] leading-none font-semibold tracking-tight tabular">
                <span>{currentTime ? currentTime.slice(0, 2) : "--"}</span>
                <span className="text-flower-rose">:</span>
                <span>{currentTime ? currentTime.slice(3, 5) : "--"}</span>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] tracking-wide text-muted-foreground">
                  已选送达时间
                </span>
              </div>
            </div>
            <TimeWheelPicker
              className="mt-4"
              hour={selectedHour ?? hourOptions[0] ?? 0}
              minute={selectedMinute ?? minuteOptions[0] ?? 0}
              hours={hourOptions}
              minutes={minuteOptions}
              onHourChange={handleHour}
              onMinuteChange={handleMinute}
              hourLabel="时"
              minuteLabel="分"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] tracking-[0.16em] text-muted-foreground">
                常用时刻
              </span>
              {quickSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() =>
                    onChange({ date: selectedDay?.key ?? value.date, time: slot.time })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    slot.time === currentTime
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
            当天已无可预约时段，请选择其他日期
          </p>
        )}
      </div>
    </div>
  );
}
