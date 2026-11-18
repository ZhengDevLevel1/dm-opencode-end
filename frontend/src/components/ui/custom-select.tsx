import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";

const PANEL_GAP = 6;
const PANEL_MIN_WIDTH = 160;
const PANEL_MAX_HEIGHT = 256;
const VIEWPORT_MARGIN = 8;

interface PanelPosition {
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
  top?: number;
  bottom?: number;
}

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps
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
    | "aria-activedescendant"
  > {
  options: readonly CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  panelClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
  panelClassName,
  searchable = false,
  searchPlaceholder = "搜索选项",
  disabled,
  id,
  ...buttonProps
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listboxId = useId();
  const reduceMotion = useReducedMotion();

  const baseOptions: readonly CustomSelectOption[] =
    placeholder === undefined
      ? options
      : [{ value: "", label: placeholder }, ...options];
  const normalizedQuery = searchable ? query.trim().toLowerCase() : "";
  const allOptions = normalizedQuery
    ? baseOptions.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : baseOptions;

  const selectedOption = baseOptions.find((option) => option.value === value);
  const hasValue = Boolean(selectedOption && selectedOption.value !== "");
  const displayLabel = selectedOption?.label ?? placeholder ?? "";
  const firstEnabledIndex = allOptions.findIndex((option) => !option.disabled);
  const lastEnabledIndex = allOptions.reduce(
    (last, option, index) => (option.disabled ? last : index),
    -1,
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
      spaceBelow < 200 && spaceAbove > spaceBelow ? "top" : "bottom";
    const maxHeight = Math.max(
      120,
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

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
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
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || !searchable) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, searchable]);

  const openPanel = (position: "selected" | "last" = "selected") => {
    setQuery("");
    const selectedBaseIndex = baseOptions.findIndex((option) => option.value === value);
    const firstBaseIndex = baseOptions.findIndex((option) => !option.disabled);
    const lastBaseIndex = baseOptions.reduce(
      (last, option, index) => (option.disabled ? last : index),
      -1,
    );
    const nextIndex =
      position === "last"
        ? lastBaseIndex
        : selectedBaseIndex >= 0 && !baseOptions[selectedBaseIndex]?.disabled
          ? selectedBaseIndex
          : firstBaseIndex;
    updatePanelPosition();
    setHighlightedIndex(nextIndex);
    setIsOpen(true);
  };

  const moveHighlight = (step: 1 | -1) => {
    if (allOptions.length === 0) return;
    let next = highlightedIndex;
    if (next < 0) next = step === 1 ? -1 : 0;
    for (let count = 0; count < allOptions.length; count += 1) {
      next = (next + step + allOptions.length) % allOptions.length;
      if (!allOptions[next]?.disabled) {
        setHighlightedIndex(next);
        return;
      }
    }
  };

  const selectOption = (option: CustomSelectOption | undefined) => {
    if (!option || option.disabled) return;
    if (option.value !== value) onChange(option.value);
    setQuery("");
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSearchChange = (next: string) => {
    setQuery(next);
    const normalized = next.trim().toLowerCase();
    const matches = normalized
      ? baseOptions.filter((option) => option.label.toLowerCase().includes(normalized))
      : baseOptions;
    setHighlightedIndex(matches.findIndex((option) => !option.disabled));
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        break;
      case "Enter":
        event.preventDefault();
        selectOption(allOptions[highlightedIndex]);
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      default:
        break;
    }
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (isOpen) moveHighlight(1);
        else openPanel();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isOpen) moveHighlight(-1);
        else openPanel("last");
        break;
      case "Home":
        if (isOpen) {
          event.preventDefault();
          setHighlightedIndex(firstEnabledIndex);
        }
        break;
      case "End":
        if (isOpen) {
          event.preventDefault();
          setHighlightedIndex(lastEnabledIndex);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) selectOption(allOptions[highlightedIndex]);
        else openPanel();
        break;
      case "Escape":
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        break;
      case "Tab":
        if (isOpen) setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const optionId = (index: number) => `${listboxId}-option-${index}`;

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
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined
        }
        onClick={() => {
          if (isOpen) setIsOpen(false);
          else openPanel();
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-base shadow-xs outline-none transition-[border-color,background-color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
          isOpen && "border-ring/70 ring-[3px] ring-ring/20",
          className,
        )}
        {...buttonProps}
      >
        <span className={cn("truncate text-left", !hasValue && "text-muted-foreground")}>
          {displayLabel}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && panelPosition
        ? createPortal(
            <motion.div
              ref={panelRef}
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
              className={cn(
                "fixed z-[70] flex flex-col overflow-hidden rounded-lg border border-border/70 bg-popover p-1 text-popover-foreground shadow-xl",
                panelPosition.placement === "bottom" ? "origin-top" : "origin-bottom",
                panelClassName,
              )}
            >
              {searchable ? (
                <div className="shrink-0 border-b border-border/60 px-1 pb-1.5 pt-1">
                  <div className="relative">
                    <Search
                      aria-hidden
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      ref={searchInputRef}
                      value={query}
                      onChange={(event) => handleSearchChange(event.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      aria-controls={listboxId}
                      autoComplete="off"
                      spellCheck={false}
                      className="h-9 pl-8"
                    />
                  </div>
                </div>
              ) : null}
              <ul
                id={listboxId}
                role="listbox"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0"
              >
                {allOptions.length === 0 ? (
                  <li
                    role="presentation"
                    className="px-3 py-5 text-center text-sm text-muted-foreground"
                  >
                    未找到匹配项
                  </li>
                ) : (
                  allOptions.map((option, index) => {
                    const isSelected = option.value === value;
                    const isHighlighted = index === highlightedIndex;
                    return (
                      <li
                        key={`${option.value}-${index}`}
                        ref={(node) => {
                          optionRefs.current[index] = node;
                        }}
                        id={optionId(index)}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        onMouseEnter={() => {
                          if (!option.disabled) setHighlightedIndex(index);
                        }}
                        onClick={() => selectOption(option)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                          "hover:bg-sky-50 dark:hover:bg-accent",
                          isHighlighted && "bg-sky-50 dark:bg-accent",
                          isSelected && "font-semibold text-foreground",
                          option.disabled && "pointer-events-none opacity-50",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        <Check
                          aria-hidden
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-primary transition-opacity",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </li>
                    );
                  })
                )}
              </ul>
            </motion.div>,
            document.body,
          )
        : null}
    </div>
  );
}
