import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { resolveImageUrl } from "@/lib/image";

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function UserAvatar({ name, src, size = "md", className }: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const resolved = resolveImageUrl(src);
  const showImage = Boolean(resolved) && !broken;
  const display = (name || "花").trim().charAt(0).toUpperCase();
  let hash = 0;
  const source = name || "flower";
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 360;
  }

  useEffect(() => {
    setBroken(false);
  }, [src]);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-primary",
        sizes[size],
        className,
      )}
      style={{
        background: `color-mix(in oklab, var(--primary) 14%, var(--card))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, oklch(60% 0.1 ${hash}) 24%, transparent)`,
      }}
      aria-hidden
    >
      {showImage ? (
        <img
          src={resolved ?? undefined}
          alt=""
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        display
      )}
    </span>
  );
}
