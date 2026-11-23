import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  contentClassName?: string;
  triggerLabel?: string;
}

type MenuPosition = Pick<CSSProperties, "top" | "bottom" | "left" | "right">;

export function DropdownMenu({
  trigger,
  children,
  align = "right",
  contentClassName,
  triggerLabel,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const next: MenuPosition =
      align === "right"
        ? { right: Math.max(gap, window.innerWidth - rect.right) }
        : { left: Math.max(gap, rect.left) };
    if (spaceBelow < 220 && rect.top > spaceBelow) {
      next.bottom = window.innerHeight - rect.top + gap;
    } else {
      next.top = rect.bottom + gap;
    }
    setPosition(next);
  }, [align]);

  useEffect(() => {
    if (!open) return;
    computePosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => setOpen(false);
    const onScroll = (event: Event) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [computePosition, open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          computePosition();
          setOpen(true);
        }}
        className="flex items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        {trigger}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={position}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("[data-dropdown-item]")) {
                  setOpen(false);
                }
              }}
              className={cn(
                "pop-in fixed z-50 max-h-[min(24rem,calc(100vh-1rem))] min-w-48 overflow-y-auto rounded-lg border border-border/60 bg-popover p-1 text-popover-foreground shadow-xl",
                contentClassName,
              )}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  className,
  destructive,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-dropdown-item
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border/60" role="separator" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
      {children}
    </div>
  );
}
