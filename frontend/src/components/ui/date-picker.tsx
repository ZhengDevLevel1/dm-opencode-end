import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const PANEL_WIDTH = 288;
const PANEL_HEIGHT = 380;
const VIEWPORT_PADDING = 12;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateValue(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function addMonthsClamped(date: Date, amount: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

function buildCalendarDays(viewDate: Date): Array<{ date: Date; inCurrentMonth: boolean }> {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstVisibleDay = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      firstVisibleDay.getFullYear(),
      firstVisibleDay.getMonth(),
      firstVisibleDay.getDate() + index,
    );
    return { date, inCurrentMonth: date.getMonth() === month };
  });
}

export interface DatePickerProps
  extends Omit<
    ComponentPropsWithoutRef<"button">,
    | "children"
    | "onChange"
    | "onClick"
    | "onKeyDown"
    | "type"
    | "value"
    | "aria-expanded"
    | "aria-haspopup"
    | "aria-controls"
  > {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "选择日期",
  className,
  disabled,
  id,
  ...buttonProps
}: DatePickerProps) {
  const selectedDate = parseDateValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => startOfMonth(selectedDate ?? new Date()));
  const [panelAlign, setPanelAlign] = useState<"start" | "end">("start");
  const [panelVertical, setPanelVertical] = useState<"top" | "bottom">("bottom");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusRef = useRef<string | null>(null);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  const today = new Date();
  const todayKey = formatDateValue(today);
  const selectedKey = selectedDate ? formatDateValue(selectedDate) : "";
  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const monthLabel = `${viewDate.getFullYear()}年${viewDate.getMonth() + 1}月`;

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        pendingFocusRef.current = null;
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        pendingFocusRef.current = null;
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const pendingKey = pendingFocusRef.current;
    if (!pendingKey) return;
    const node = dayRefs.current.get(pendingKey);
    if (node) {
      node.focus();
      pendingFocusRef.current = null;
    }
  }, [isOpen, viewDate]);

  const updatePlacement = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceRight = window.innerWidth - rect.left - VIEWPORT_PADDING;
    const spaceLeft = rect.right - VIEWPORT_PADDING;
    setPanelAlign(spaceRight >= PANEL_WIDTH || spaceRight >= spaceLeft ? "start" : "end");
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    setPanelVertical(spaceBelow >= PANEL_HEIGHT || spaceBelow >= spaceAbove ? "bottom" : "top");
  };

  const openPanel = () => {
    const baseDate = selectedDate ?? new Date();
    setViewDate(startOfMonth(baseDate));
    pendingFocusRef.current = formatDateValue(baseDate);
    updatePlacement();
    setIsOpen(true);
  };

  const closePanel = (focusTrigger = false) => {
    setIsOpen(false);
    pendingFocusRef.current = null;
    if (focusTrigger) triggerRef.current?.focus();
  };

  const chooseDate = (date: Date) => {
    onChange(formatDateValue(date));
    closePanel(true);
  };

  const focusDate = (date: Date) => {
    const key = formatDateValue(date);
    if (isSameMonth(date, viewDate)) {
      dayRefs.current.get(key)?.focus();
      return;
    }
    pendingFocusRef.current = key;
    setViewDate(startOfMonth(date));
  };

  const handleDayKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    date: Date,
  ) => {
    let nextDate: Date;
    switch (event.key) {
      case "ArrowLeft":
        nextDate = addDays(date, -1);
        break;
      case "ArrowRight":
        nextDate = addDays(date, 1);
        break;
      case "ArrowUp":
        nextDate = addDays(date, -7);
        break;
      case "ArrowDown":
        nextDate = addDays(date, 7);
        break;
      case "Home":
        nextDate = addDays(date, -((date.getDay() + 6) % 7));
        break;
      case "End":
        nextDate = addDays(date, 6 - ((date.getDay() + 6) % 7));
        break;
      case "PageUp":
        nextDate = addMonthsClamped(date, -1);
        break;
      case "PageDown":
        nextDate = addMonthsClamped(date, 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        chooseDate(date);
        return;
      default:
        return;
    }
    event.preventDefault();
    focusDate(nextDate);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => {
          if (isOpen) closePanel();
          else openPanel();
        }}
        className={cn(
          "flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-transparent px-3 py-1 text-left text-base shadow-xs outline-none transition-[border-color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
          isOpen && "border-ring/70 ring-[3px] ring-ring/20",
          className,
        )}
        {...buttonProps}
      >
        <span className={cn("min-w-0 truncate", !selectedDate && "text-muted-foreground")}>
          {selectedDate ? formatDateValue(selectedDate) : placeholder}
        </span>
        <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen ? (
        <motion.div
          id={panelId}
          role="dialog"
          aria-label="选择日期"
          initial={
            reduceMotion
              ? false
              : { opacity: 0, y: panelVertical === "bottom" ? -6 : 6, scale: 0.98 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 34, mass: 0.7 }
          }
          className={cn(
            "absolute z-50 max-h-[calc(100vh-1.5rem)] w-[18rem] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-border/70 bg-popover p-3 text-popover-foreground shadow-xl",
            panelVertical === "bottom"
              ? "top-full mt-2 origin-top"
              : "bottom-full mb-2 origin-bottom",
            panelAlign === "start" ? "left-0" : "right-0",
          )}
        >
          <div className="flex items-center justify-between gap-2 pb-2">
            <span className="text-sm font-semibold tracking-tight">{monthLabel}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="上个月"
                onClick={() => setViewDate((current) => addMonthsClamped(current, -1))}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="下个月"
                onClick={() => setViewDate((current) => addMonthsClamped(current, 1))}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-slate-400 dark:text-muted-foreground/70">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1 font-medium">
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, inCurrentMonth }) => {
              const key = formatDateValue(date);
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  ref={(node) => {
                    if (node) dayRefs.current.set(key, node);
                    else dayRefs.current.delete(key);
                  }}
                  type="button"
                  aria-label={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => chooseDate(date)}
                  onKeyDown={(event) => handleDayKeyDown(event, date)}
                  className={cn(
                    "flex h-9 w-full min-w-0 cursor-pointer items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                    !inCurrentMonth &&
                      "text-slate-300 hover:bg-slate-100 dark:text-muted-foreground/40 dark:hover:bg-accent",
                    inCurrentMonth &&
                      !isSelected &&
                      "text-foreground hover:bg-slate-100 dark:hover:bg-accent",
                    isToday && !isSelected && "font-medium text-primary ring-1 ring-primary/50 ring-inset",
                    isSelected &&
                      "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
            <button
              type="button"
              disabled={!selectedDate}
              onClick={() => {
                onChange("");
                closePanel(true);
              }}
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              清除
            </button>
            <button
              type="button"
              onClick={() => chooseDate(today)}
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              今天
            </button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
