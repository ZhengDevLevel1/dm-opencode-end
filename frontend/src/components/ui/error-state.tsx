import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/cn";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "数据没送到",
  description = "请稍后重试，或刷新页面。",
  onRetry,
  className,
  compact,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/[0.03] px-6 text-center",
        compact ? "py-8" : "py-14",
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="h-7 w-7 text-destructive/70" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          重试
        </Button>
      ) : null}
    </div>
  );
}
