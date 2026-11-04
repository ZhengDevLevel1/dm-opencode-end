import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  contentClassName?: string;
  triggerLabel?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "right",
  contentClassName,
  triggerLabel,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("[data-dropdown-item]")) {
              setOpen(false);
            }
          }}
          className={cn(
            "pop-in absolute top-full z-40 mt-2 min-w-48 rounded-lg border border-border/60 bg-popover p-1 text-popover-foreground shadow-xl",
            align === "right" ? "right-0" : "left-0",
            contentClassName,
          )}
        >
          {children}
        </div>
      ) : null}
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
