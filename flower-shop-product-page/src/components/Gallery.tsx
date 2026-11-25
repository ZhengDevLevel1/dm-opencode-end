import { useState } from "react";
import { cn } from "@/utils/cn";
import { gallery } from "@/data/product";
import ZoomImage from "@/components/ZoomImage";
import { ChevronLeft, ChevronRight, SparkIcon } from "@/components/icons";

export default function Gallery() {
  const [active, setActive] = useState(0);

  const go = (dir: number) => {
    setActive((i) => (i + dir + gallery.length) % gallery.length);
  };

  return (
    <div className="lg:sticky lg:top-32">
      <div className="flex flex-col-reverse gap-4 sm:flex-row">
        {/* Thumbs */}
        <div className="no-scrollbar flex gap-3 overflow-x-auto sm:flex-col sm:overflow-visible">
          {gallery.map((img, i) => (
            <button
              key={img.src}
              onClick={() => setActive(i)}
              className={cn(
                "group relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border transition-all duration-300 sm:h-[86px] sm:w-[68px]",
                i === active
                  ? "border-moss-600 ring-1 ring-moss-600/20"
                  : "border-cream-200 opacity-70 hover:opacity-100",
              )}
              aria-label={img.label}
            >
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" loading="lazy" />
              {i === active && (
                <span className="absolute inset-x-0 bottom-0 bg-moss-700/80 py-0.5 text-center text-[9px] tracking-wider text-cream-100">
                  {img.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main image — loupe inspection only, no click action */}
        <div className="relative flex-1 animate-fade-up">
          <ZoomImage
            src={gallery[active].src}
            alt={gallery[active].alt}
            wrapperClassName="relative aspect-4/5 w-full rounded-2xl border border-cream-200 bg-cream-100"
            className="h-full w-full object-cover"
            zoom={1.7}
          >
            {/* Top-left badges */}
            <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
              <span className="rounded-full bg-moss-700/90 px-3 py-1 text-[11px] tracking-[0.14em] text-cream-100 backdrop-blur">
                今日现货
              </span>
              <span className="rounded-full bg-blush-100/95 px-3 py-1 text-[11px] tracking-[0.14em] text-blush-600 backdrop-blur">
                花市直采
              </span>
            </div>

            {/* Bottom caption */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-moss-900/55 to-transparent p-4 pt-16">
              <span className="font-serif text-sm tracking-widest text-cream-50">
                {gallery[active].label}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-cream-50/85 px-2.5 py-1 font-display text-[10px] tracking-[0.2em] text-moss-700">
                <SparkIcon className="h-3 w-3" />
                {String(active + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}
              </span>
            </div>
          </ZoomImage>

          {/* Arrows */}
          <button
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/85 text-moss-700 shadow-sm backdrop-blur transition-all hover:bg-cream-50 hover:text-blush-500 sm:flex"
            aria-label="上一张"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/85 text-moss-700 shadow-sm backdrop-blur transition-all hover:bg-cream-50 hover:text-blush-500 sm:flex"
            aria-label="下一张"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filmstrip (mobile) */}
      <div className="mt-4 flex items-center justify-center gap-1.5 sm:hidden">
        {gallery.map((g, i) => (
          <button
            key={g.src}
            onClick={() => setActive(i)}
            className={cn(
              "h-1 rounded-full transition-all",
              i === active ? "w-7 bg-moss-600" : "w-3 bg-cream-200",
            )}
            aria-label={g.label}
          />
        ))}
      </div>
    </div>
  );
}
