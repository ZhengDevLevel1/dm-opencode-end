import { cn } from "@/lib/cn";

interface UserAvatarProps {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function UserAvatar({ name, size = "md", className }: UserAvatarProps) {
  const display = (name || "花").trim().charAt(0).toUpperCase();
  let hash = 0;
  const source = name || "flower";
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 360;
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-primary",
        sizes[size],
        className,
      )}
      style={{
        background: `color-mix(in oklab, var(--primary) 14%, var(--card))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, oklch(60% 0.1 ${hash}) 24%, transparent)`,
      }}
      aria-hidden
    >
      {display}
    </span>
  );
}
