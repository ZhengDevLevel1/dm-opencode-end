import { cn } from "@/lib/cn";

interface TagListProps {
  tags: string[];
  max?: number;
  className?: string;
  tone?: "default" | "flower" | "outline";
}

const tones = {
  default: "bg-secondary text-secondary-foreground",
  flower: "bg-flower-rose/10 text-flower-rose",
  outline: "border border-border/70 text-muted-foreground",
};

export function TagList({ tags, max = 4, className, tone = "default" }: TagListProps) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const rest = tags.length - visible.length;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((tag) => (
        <span
          key={tag}
          className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}
        >
          {tag}
        </span>
      ))}
      {rest > 0 ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
