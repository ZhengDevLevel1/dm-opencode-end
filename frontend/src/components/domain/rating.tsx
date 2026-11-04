import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRating } from "@/lib/format";

interface RatingProps {
  value?: number | null;
  count?: number;
  className?: string;
  showValue?: boolean;
  compact?: boolean;
}

export function Rating({ value, count, className, showValue = true, compact }: RatingProps) {
  const rating = value ?? 0;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              compact ? "h-3 w-3" : "h-3.5 w-3.5",
              index < Math.round(rating)
                ? "fill-warning text-warning"
                : "fill-transparent text-border",
            )}
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-xs text-muted-foreground tabular">
          {formatRating(rating)}
          {count !== undefined ? ` (${count})` : ""}
        </span>
      ) : (
        <span className="sr-only">{formatRating(rating)} 分</span>
      )}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function StarInput({ value, onChange, disabled }: StarInputProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="评分">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} 分`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className="cursor-pointer rounded p-1 transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              star <= value ? "fill-warning text-warning" : "fill-transparent text-border",
            )}
          />
        </button>
      ))}
      <span className="ml-1 text-sm font-medium tabular">{value} 分</span>
    </div>
  );
}
