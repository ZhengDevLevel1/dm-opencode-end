import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  onClick?: () => void;
  filled?: boolean;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
  filled,
  className,
}: StatCardProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          filled ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <span className="mt-0.5 block text-lg font-semibold tracking-tight tabular">{value}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
      {onClick ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "ui-card group flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("ui-card flex items-center gap-3 px-4 py-3.5", className)}>
      {content}
    </div>
  );
}
