import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ProductImage } from "./product-image";

interface ZoomImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  zoom?: number;
  seed?: string;
  iconClassName?: string;
  children?: ReactNode;
}

export function ZoomImage({
  src,
  alt,
  className,
  wrapperClassName,
  zoom = 1.7,
  seed,
  iconClassName,
  children,
}: ZoomImageProps) {
  const [active, setActive] = useState(false);
  const [broken, setBroken] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  useEffect(() => {
    setBroken(false);
  }, [src]);

  return (
    <div
      className={cn("group relative overflow-hidden", wrapperClassName)}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setOrigin({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      {broken ? (
        <ProductImage
          src={src}
          alt={alt}
          seed={seed ?? alt}
          className="h-full w-full"
          iconClassName={iconClassName}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setBroken(true)}
          className={cn(
            "h-full w-full cursor-zoom-in object-cover transition-transform duration-500 ease-out",
            className,
          )}
          style={{
            transform: active ? `scale(${zoom})` : "scale(1)",
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        />
      )}
      {children ? <div className="pointer-events-none absolute inset-0">{children}</div> : null}
    </div>
  );
}
