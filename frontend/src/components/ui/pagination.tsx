import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  pageSize?: number;
}

function buildPages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const set = new Set<number>([1, total, current, current - 1, current + 1]);
  const pages = Array.from(set)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

export function Pagination({
  page,
  pages,
  total,
  onPageChange,
  className,
  pageSize,
}: PaginationProps) {
  if (total === 0) return null;
  const list = buildPages(page, Math.max(pages, 1));
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 px-1 py-1 sm:flex-row",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground tabular">
        共 {total} 条{pageSize ? ` · 每页 ${pageSize} 条` : ""} · 第 {page} / {Math.max(pages, 1)} 页
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="上一页"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {list.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`e-${index}`} className="px-1 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "default" : "ghost"}
              size="icon-sm"
              className="tabular text-xs"
              aria-label={`第 ${item} 页`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="下一页"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
