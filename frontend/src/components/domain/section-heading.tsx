import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-tight md:text-xl">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground md:text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
