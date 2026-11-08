import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

const PANEL_GAP = 6;
const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_HEIGHT = 360;
const VIEWPORT_MARGIN = 8;
const TAG_SEPARATOR = /[,，、;；/|\s]+/;

interface PanelPosition {
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
  top?: number;
  bottom?: number;
}

export interface TagPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  joinWith?: string;
  maxLength?: number;
  maxSelected?: number;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(TAG_SEPARATOR)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function TagPicker({
  id,
  value,
  onChange,
  options,
  placeholder = "点击选择标签",
  joinWith = ",",
  maxLength = 200,
  maxSelected,
  invalid,
  describedBy,
  className,
}: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  const selected = useMemo(() => parseTags(value), [value]);
  const allOptions = useMemo(
    () => [...selected, ...options.filter((tag) => !selected.includes(tag))],
    [options, selected],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(
    () =>
      normalizedQuery
        ? allOptions.filter((option) => option.toLowerCase().includes(normalizedQuery))
        : allOptions,
    [allOptions, normalizedQuery],
  );

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      Math.max(rect.width, PANEL_MIN_WIDTH),
      viewportWidth - VIEWPORT_MARGIN * 2,
    );
    let left = rect.left;
    if (left + width > viewportWidth - VIEWPORT_MARGIN) {
      left = rect.right - width;
    }
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - width - VIEWPORT_MARGIN));

    const spaceBelow = viewportHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - PANEL_GAP - VIEWPORT_MARGIN;
    const placement: "top" | "bottom" =
      spaceBelow < 260 && spaceAbove > spaceBelow ? "top" : "bottom";
    const maxHeight = Math.max(
      180,
      Math.min(PANEL_MAX_HEIGHT, placement === "bottom" ? spaceBelow : spaceAbove),
    );

    if (placement === "bottom") {
      setPanelPosition({
        left,
        width,
        maxHeight,
        placement,
        top: rect.bottom + PANEL_GAP,
      });
    } else {
      setPanelPosition({
        left,
        width,
        maxHeight,
        placement,
        bottom: viewportHeight - rect.top + PANEL_GAP,
      });
    }
  }, []);

  const closePanel = useCallback((focusTrigger = false) => {
    setIsOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const openPanel = useCallback(() => {
    updatePanelPosition();
    setQuery("");
    setIsOpen(true);
  }, [updatePanelPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 30);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      closePanel();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePanel(true);
    };
    const handleResize = () => updatePanelPosition();
    const handleScroll = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      updatePanelPosition();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [closePanel, isOpen, updatePanelPosition]);

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((item) => item !== tag).join(joinWith));
      return;
    }
    if (maxSelected !== undefined && selected.length >= maxSelected) return;
    const next = [...selected, tag];
    if (next.join(joinWith).length > maxLength) return;
    onChange(next.join(joinWith));
  };

  const removeTag = (tag: string) => {
    onChange(selected.filter((item) => item !== tag).join(joinWith));
  };

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const nodes = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((node) => node.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const panelStyle: CSSProperties | undefined = panelPosition
    ? {
        left: panelPosition.left,
        width: panelPosition.width,
        maxHeight: panelPosition.maxHeight,
        ...(panelPosition.placement === "bottom"
          ? { top: panelPosition.top }
          : { bottom: panelPosition.bottom }),
      }
    : undefined;

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        onClick={() => {
          if (!isOpen) openPanel();
        }}
        className={cn(
          "flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-border bg-transparent px-2 py-1.5 text-sm shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
          invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
          className,
        )}
      >
        {selected.length === 0 ? (
          <span className="px-1 text-xs text-muted-foreground">{placeholder}</span>
        ) : (
          selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                aria-label={`移除 ${tag}`}
                onClick={(event) => {
                  event.stopPropagation();
                  removeTag(tag);
                }}
                className="rounded-sm p-0.5 text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onClick={(event) => {
            event.stopPropagation();
            if (isOpen) closePanel(true);
            else openPanel();
          }}
          className="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          选择
          <ChevronDown
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 ease-out",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {isOpen && panelPosition
        ? createPortal(
            <motion.div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label="选择标签"
              style={panelStyle}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: panelPosition.placement === "bottom" ? -6 : 6,
                      scale: 0.98,
                    }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 520, damping: 34, mass: 0.7 }
              }
              onKeyDown={handlePanelKeyDown}
              className={cn(
                "fixed z-[80] flex flex-col overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-xl",
                panelPosition.placement === "bottom" ? "origin-top" : "origin-bottom",
              )}
            >
              <div className="border-b border-border/60 px-3 pt-3 pb-2.5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">选择标签</p>
                  <p className="text-[10px] text-muted-foreground">
                    {maxSelected !== undefined
                      ? `最多选 ${maxSelected} 个`
                      : `最多 ${maxLength} 字符`}
                  </p>
                </div>
                <div className="relative">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索标签"
                    aria-label="搜索标签"
                    className="h-8 w-full rounded-md border border-border bg-background/70 pr-2.5 pl-8 text-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    没有匹配的标签
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {filteredOptions.map((tag) => {
                      const isSelected = selected.includes(tag);
                      const reachedMax =
                        !isSelected && maxSelected !== undefined && selected.length >= maxSelected;
                      const wouldExceed =
                        !isSelected &&
                        !reachedMax &&
                        [...selected, tag].join(joinWith).length > maxLength;
                      const disabled = reachedMax || wouldExceed;
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          disabled={disabled}
                          className={cn(
                            "flex min-w-0 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                            "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                            isSelected && "bg-primary/10 font-medium text-primary",
                            disabled && "cursor-not-allowed opacity-40",
                          )}
                        >
                          <span className="truncate">{tag}</span>
                          {isSelected ? <Check aria-hidden className="h-3.5 w-3.5 shrink-0" /> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
                <span className="text-[11px] text-muted-foreground">
                  已选 {selected.length}
                  {maxSelected !== undefined ? ` / ${maxSelected}` : ""} 个
                </span>
                <div className="flex items-center gap-1">
                  {selected.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => onChange("")}
                      className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      清空
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => closePanel(true)}
                    className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    完成
                  </button>
                </div>
              </div>
            </motion.div>,
            document.body,
          )
        : null}
    </div>
  );
}
