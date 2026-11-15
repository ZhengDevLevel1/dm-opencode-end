import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div
      className="flex min-h-[calc(100dvh-9rem)] w-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="sr-only">页面加载中</span>
    </div>
  );
}
