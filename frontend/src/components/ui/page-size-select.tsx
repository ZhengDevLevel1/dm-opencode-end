import { cn } from "@/lib/cn";
import { PAGE_SIZE_OPTIONS } from "@/lib/page-size-options";
import { CustomSelect } from "@/components/ui/custom-select";

interface PageSizeSelectProps {
  value: number;
  onChange: (pageSize: number) => void;
  options?: readonly number[];
  className?: string;
}

export function PageSizeSelect({
  value,
  onChange,
  options = PAGE_SIZE_OPTIONS.standard,
  className,
}: PageSizeSelectProps) {
  const sizes = Array.from(new Set([...options, value])).sort((a, b) => a - b);
  const selectOptions = sizes.map((size) => ({
    value: String(size),
    label: `${size} 条`,
  }));

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className="whitespace-nowrap">每页</span>
      <div className="w-[4.75rem] shrink-0">
        <CustomSelect
          aria-label="每页条数"
          value={String(value)}
          onChange={(next) => onChange(Number(next))}
          options={selectOptions}
          className="h-8 px-2 text-xs md:text-xs"
        />
      </div>
    </div>
  );
}
