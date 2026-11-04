import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";

interface PriceProps {
  amount?: number | null;
  originalAmount?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function Price({ amount, originalAmount, className, size = "md" }: PriceProps) {
  const hasDiscount =
    originalAmount !== undefined &&
    originalAmount !== null &&
    amount !== undefined &&
    amount !== null &&
    originalAmount > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-2", className)}>
      <span className={cn("font-semibold tabular text-foreground", sizes[size])}>
        {formatCurrency(amount)}
      </span>
      {hasDiscount ? (
        <span className="text-xs text-muted-foreground line-through tabular">
          {formatCurrency(originalAmount)}
        </span>
      ) : null}
    </span>
  );
}
