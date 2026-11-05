import { useState, type ReactNode } from "react";
import { Flower2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { gradientFor, resolveImageUrl } from "@/lib/image";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  seed?: string;
  className?: string;
  iconClassName?: string;
  fit?: "cover" | "contain";
  overlay?: ReactNode;
}

export function ProductImage({
  src,
  alt,
  seed,
  className,
  iconClassName,
  fit = "cover",
  overlay,
}: ProductImageProps) {
  const resolved = resolveImageUrl(src);
  const [broken, setBroken] = useState(false);
  const showImage = resolved && !broken;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {showImage ? (
        <img
          src={resolved}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(true)}
          className={cn(
            "h-full w-full",
            fit === "contain" ? "object-contain" : "object-cover",
          )}
        />
      ) : (
        <div
          className="image-fallback flex h-full w-full items-center justify-center"
          style={{ background: seed ? gradientFor(seed) : undefined }}
          role="img"
          aria-label={alt}
        >
          <Flower2
            className={cn("h-10 w-10 text-foreground/25", iconClassName)}
            strokeWidth={1.5}
            aria-hidden
          />
        </div>
      )}
      {overlay}
    </div>
  );
}
