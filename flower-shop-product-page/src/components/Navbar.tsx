import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { CartIcon, FlowerIcon, HeartIcon, SearchIcon, UserIcon } from "@/components/icons";

const navLinks = [
  { label: "全部花礼", active: false },
  { label: "告白玫瑰", active: false },
  { label: "生日花束", active: false },
  { label: "开业花篮", active: false },
  { label: "永生花", active: false },
  { label: "企业订阅", active: false },
  { label: "花艺课程", active: false },
];

type Props = {
  cartCount: number;
  wishlisted: boolean;
};

export default function Navbar({ cartCount, wishlisted }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-40 w-full">
      {/* Announcement strip */}
      <div className="bg-moss-900 text-cream-100">
        <div className="mx-auto flex max-w-[1280px] items-center justify-center gap-3 px-4 py-2 text-[10.5px] tracking-[0.2em] sm:text-[11.5px]">
          <span className="hidden h-[3px] w-[3px] rotate-45 bg-brass-500 sm:block" />
          <span>今日下单 · 全城三小时送达 · 支持当日指定时段</span>
          <span className="hidden h-[3px] w-[3px] rotate-45 bg-brass-500 sm:block" />
        </div>
      </div>

      <header
        className={cn(
          "border-b border-cream-200/80 bg-cream-50/90 backdrop-blur-xl transition-all duration-300",
          scrolled && "shadow-[0_8px_30px_-18px_rgba(20,32,26,0.35)]",
        )}
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-6 py-4 lg:py-5">
            {/* Brand */}
            <a href="#" className="group flex shrink-0 items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brass-300/70 bg-moss-50 text-moss-600 transition-all duration-300 group-hover:rotate-45 group-hover:border-brass-500 group-hover:text-blush-500">
                <FlowerIcon className="h-5 w-5" />
              </span>
              <span className="leading-none">
                <span className="block font-serif text-xl font-semibold tracking-[0.2em] text-moss-900">
                  拾花集
                </span>
                <span className="mt-1.5 block font-display text-[9.5px] tracking-[0.36em] text-brass-500">
                  PETALS &amp; POEMS
                </span>
              </span>
            </a>

            {/* Search */}
            <div className="hidden flex-1 max-w-md items-center lg:flex">
              <div className="flex w-full items-center gap-2 rounded-full border border-cream-200 bg-white/70 px-4 py-2.5 transition-colors focus-within:border-blush-400">
                <SearchIcon className="h-4 w-4 shrink-0 text-moss-500" />
                <input
                  placeholder="搜索花材、场合或心意…"
                  className="w-full bg-transparent text-sm text-moss-900 placeholder:text-moss-500/50 focus:outline-none"
                />
                <kbd className="hidden shrink-0 rounded border border-cream-200 px-1.5 py-0.5 font-display text-[10px] tracking-widest text-moss-500/70 xl:block">
                  ⏎
                </kbd>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button className="hidden h-10 w-10 items-center justify-center rounded-full text-moss-700 transition-colors hover:bg-white hover:text-blush-500 sm:flex">
                <UserIcon className="h-5 w-5" />
              </button>
              <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-moss-700 transition-colors hover:bg-white hover:text-blush-500">
                <HeartIcon className="h-5 w-5" filled={wishlisted} />
                {wishlisted && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blush-500 ring-2 ring-cream-50" />
                )}
              </button>
              <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-moss-700 transition-colors hover:bg-white hover:text-blush-500">
                <CartIcon className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blush-500 px-1 text-[10px] font-semibold text-white ring-2 ring-cream-50">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Nav links */}
          <nav className="no-scrollbar -mb-px flex items-center gap-1 overflow-x-auto pb-3">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onMouseEnter={() => setHovered(link.label)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-2 text-[13px] tracking-wide transition-colors",
                  hovered === link.label
                    ? "bg-white text-moss-900"
                    : "text-moss-600 hover:text-moss-900",
                )}
              >
                {link.label}
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 pl-4 pr-1 font-display text-[11px] tracking-[0.2em] text-moss-500/60 lg:block">
              FLORIST SINCE 2016
            </span>
          </nav>
        </div>
      </header>
    </div>
  );
}
