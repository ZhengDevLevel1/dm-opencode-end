import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useToastStore } from "@/stores/toast";
import { Button } from "./button";
import { cn } from "@/lib/cn";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const tone = {
  success: "text-success",
  error: "text-destructive",
  info: "text-primary",
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((item) => {
        const Icon = icons[item.variant];
        return (
          <div
            key={item.id}
            role={item.variant === "error" ? "alert" : "status"}
            className="list-enter pointer-events-auto flex items-start gap-3 rounded-xl border border-border/60 bg-popover p-3.5 text-popover-foreground shadow-xl"
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone[item.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs break-words text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="关闭提示"
              onClick={() => dismiss(item.id)}
              className="-mt-1 -mr-1"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
