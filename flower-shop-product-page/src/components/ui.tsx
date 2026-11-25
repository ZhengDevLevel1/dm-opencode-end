import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

/**
 * Editorial section header: brass index numeral → tracked kicker → rule →
 * large serif title. Establishes the hierarchy the page was missing.
 */
export function SectionHeading({
  index,
  kicker,
  title,
  sub,
  action,
  className,
}: {
  index?: string;
  kicker: string;
  title: string;
  sub?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-5", className)}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-3 font-display text-[10px] uppercase tracking-[0.34em] text-brass-500">
          {index && (
            <span className="num text-[12px] tracking-[0.14em] text-brass-300">{index}</span>
          )}
          <span className="h-px w-7 bg-brass-300" />
          {kicker}
        </p>
        <h2 className="mt-4 font-serif text-[26px] leading-[1.24] font-semibold tracking-[-0.01em] text-moss-900 text-balance sm:text-[34px]">
          {title}
        </h2>
        {sub && (
          <p className="mt-3.5 max-w-2xl text-[13.5px] leading-[1.95] text-moss-600">{sub}</p>
        )}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </header>
  );
}

/** Mid-level heading for sub-blocks inside a section. */
export function SubHeading({
  index,
  title,
  note,
  className,
}: {
  index?: string;
  title: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
      {index && (
        <span className="num font-display text-[11px] tracking-[0.16em] text-brass-500">
          {index}
        </span>
      )}
      <h3 className="font-serif text-[19px] leading-tight font-semibold tracking-tight text-moss-900 sm:text-[21px]">
        {title}
      </h3>
      {note && <span className="text-[11.5px] text-moss-500">{note}</span>}
      <span className="rule-brass mt-1 h-px w-16 shrink-0 self-end opacity-70" />
    </div>
  );
}

/** Small tracked label used above fields in the purchase panel. */
export function FieldLabel({
  index,
  title,
  note,
}: {
  index: string;
  title: string;
  note?: string;
}) {
  return (
    <h3 className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="num font-display text-[11px] tracking-[0.16em] text-brass-500">{index}</span>
      <span className="h-px w-4 self-center bg-brass-300" />
      <span className="font-serif text-[15px] font-semibold tracking-[0.06em] text-moss-900">
        {title}
      </span>
      {note && <span className="text-[11px] text-moss-500">{note}</span>}
    </h3>
  );
}
