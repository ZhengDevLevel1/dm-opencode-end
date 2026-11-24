import { useEffect, useRef, useState, type FocusEvent } from "react";
import { cn } from "@/lib/cn";

export interface ChatOutlineItem {
  id: string;
  content: string;
}

interface ChatOutlineNavProps {
  items: ChatOutlineItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const CLOSE_DELAY = 600;

export function ChatOutlineNav({ items, activeId, onSelect }: ChatOutlineNavProps) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const cancelClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const clearHover = () => {
    setHoveredId(null);
    setTooltipTop(null);
  };

  const openNow = () => {
    cancelClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      clearHover();
      setOpen(false);
    }, CLOSE_DELAY);
  };

  const closeNow = () => {
    cancelClose();
    clearHover();
    setOpen(false);
  };

  useEffect(() => () => cancelClose(), []);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      scheduleClose();
    }
  };

  const handleRowEnter = (id: string) => {
    setHoveredId(id);
    const row = rowRefs.current.get(id);
    const wrapper = wrapperRef.current;
    if (!row || !wrapper) return;
    const rowRect = row.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    setTooltipTop(rowRect.top - wrapperRect.top + rowRect.height / 2);
  };

  if (items.length === 0) return null;

  const hoveredItem = hoveredId
    ? (items.find((item) => item.id === hoveredId) ?? null)
    : null;

  return (
    <div
      className="absolute top-1/2 right-4 z-20 hidden -translate-y-1/2 md:block"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      onFocusCapture={openNow}
      onBlurCapture={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeNow();
      }}
    >
      <div
        ref={wrapperRef}
        role="navigation"
        aria-label="对话目录"
        className={cn(
          "relative transition-[width,background-color,border-color,box-shadow] duration-300 ease-out",
          open
            ? "w-[336px] rounded-2xl border border-border/60 bg-card/95 shadow-card backdrop-blur-md"
            : "w-10 border-0 bg-transparent",
        )}
      >
        <div
          ref={scrollRef}
          onScroll={clearHover}
          className={cn(
            "scrollbar-none max-h-[min(70vh,520px,calc(100cqh_-_2rem))] overflow-x-hidden overflow-y-auto py-2.5",
            open ? "px-2.5" : "px-0",
          )}
        >
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(item.id, node);
                  } else {
                    rowRefs.current.delete(item.id);
                  }
                }}
                type="button"
                onClick={() => onSelect(item.id)}
                onMouseEnter={() => handleRowEnter(item.id)}
                onMouseLeave={clearHover}
                aria-current={active ? "true" : undefined}
                aria-label={item.content}
                className={cn(
                  "group flex h-10 w-full items-center rounded-lg text-left focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  open ? "gap-3" : "gap-0.5 pr-2.5",
                )}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px] leading-5 transition-opacity duration-200",
                    open ? "opacity-100" : "pointer-events-none opacity-0",
                    active
                      ? "font-medium text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {item.content}
                </span>
                <span className="flex h-10 w-7 shrink-0 items-center justify-end">
                  <span
                    className={cn(
                      "block h-1 rounded-full transition-all duration-200",
                      active
                        ? "w-7 bg-primary"
                        : "w-3.5 bg-muted-foreground/25 group-hover:bg-foreground/45",
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {open && hoveredItem && tooltipTop != null ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute right-full z-10 mr-3 w-max max-w-[280px] -translate-y-1/2 rounded-lg bg-zinc-900/95 px-3 py-1.5 text-xs leading-5 text-white shadow-lg"
            style={{ top: tooltipTop }}
          >
            {hoveredItem.content}
          </div>
        ) : null}
      </div>
    </div>
  );
}
