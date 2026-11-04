import type { LucideIcon } from "lucide-react";
import { Flower2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  bare?: boolean;
}

export function EmptyState({
  icon: Icon = Flower2,
  title,
  description,
  action,
  className,
  bare,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        !bare && "rounded-xl border border-dashed border-border/70",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-muted-foreground opacity-40" strokeWidth={1.75} />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
