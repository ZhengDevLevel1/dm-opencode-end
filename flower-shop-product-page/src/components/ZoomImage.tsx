import { useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type Props = {
  src: string;
  alt: string;
  /** classes for the <img> itself */
  className?: string;
  /** classes for the clipping wrapper — must establish size/position */
  wrapperClassName?: string;
  /** magnification on hover */
  zoom?: number;
  /** scrim painted over the image but UNDER the overlays */
  veil?: ReactNode;
  children?: ReactNode;
};

/**
 * Cursor-following scale zoom on hover. Deliberately NOT clickable —
 * there is no lightbox; the zoom itself is the whole "viewing" affordance.
 */
export default function ZoomImage({
  src,
  alt,
  className,
  wrapperClassName,
  zoom = 1.7,
  veil,
  children,
}: Props) {
  const [on, setOn] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  return (
    <div
      className={cn("group relative overflow-hidden", wrapperClassName)}
      onMouseEnter={() => setOn(true)}
      onMouseLeave={() => setOn(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          "h-full w-full cursor-zoom-in object-cover transition-transform duration-500 ease-out",
          className,
        )}
        style={{
          transform: on ? `scale(${zoom})` : "scale(1)",
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
      />

      {/* scrim belongs to the image, so it goes UNDER the overlays */}
      {veil}

      {children && <div className="pointer-events-none absolute inset-0">{children}</div>}
    </div>
  );
}
