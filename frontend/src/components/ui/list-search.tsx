import { forwardRef, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface ListSearchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  containerClassName?: string;
}

export const ListSearch = forwardRef<HTMLInputElement, ListSearchProps>(
  ({ value, onChange, onSubmit, onClear, className, containerClassName, ...props }, ref) => {
    const clear = () => {
      onChange("");
      onClear?.();
    };

    return (
      <div className={cn("relative w-full", containerClassName)}>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit?.();
            }
            if (event.key === "Escape" && value) {
              event.preventDefault();
              clear();
            }
          }}
          className={cn("pl-10", value && "pr-10", className)}
          {...props}
        />
        {value ? (
          <button
            type="button"
            aria-label="清空搜索"
            onClick={clear}
            className="absolute top-1/2 right-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  },
);
ListSearch.displayName = "ListSearch";
