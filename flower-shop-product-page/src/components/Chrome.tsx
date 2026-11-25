import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { product } from "@/data/product";
import { useProduct } from "@/state";
import { CartIcon, CheckIcon, CloseIcon, FlowerIcon, HeartIcon } from "@/components/icons";

export function Toast({
  message,
  sub,
  onClose,
}: {
  message: string;
  sub?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [message, sub, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 sm:bottom-10">
      <div className="animate-toast-in pointer-events-auto flex max-w-md items-start gap-3 rounded-xl border border-moss-100 bg-moss-900/95 px-5 py-4 text-cream-50 shadow-2xl backdrop-blur">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush-500/25 text-blush-200">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="font-serif text-[14px] tracking-wide">{message}</p>
          {sub && <p className="mt-1 text-[11.5px] leading-relaxed text-cream-200/70">{sub}</p>}
        </div>
        <button onClick={onClose} className="ml-2 text-cream-200/60 transition-colors hover:text-cream-50">
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function StickyBar({
  onAddToCart,
  onBuyNow,
  wishlisted,
  onToggleWish,
}: {
  onAddToCart: (payload: { qty: number; spec: string; total: number }) => void;
  onBuyNow: () => void;
  wishlisted: boolean;
  onToggleWish: () => void;
}) {
  const { currentSpec, currentWrap, qty, unitPrice, total } = useProduct();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-cream-50/95 backdrop-blur-xl transition-all duration-300",
        show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <img
          src="https://images.pexels.com/photos/33791888/pexels-photo-33791888.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=200"
          alt=""
          className="hidden h-12 w-12 rounded-lg object-cover ring-1 ring-cream-200 sm:block"
          loading="lazy"
        />
        <div className="hidden min-w-0 flex-col sm:flex">
          <p className="truncate font-serif text-[14px] text-moss-900">{product.name}</p>
          <p className="truncate text-[11px] text-moss-500">
            {currentSpec.name} · {currentWrap.name} · ×{qty} · 今日 3 小时可送
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-baseline gap-2 sm:flex">
            <span className="font-display text-xs text-blush-600">¥</span>
            <span className="font-serif text-2xl font-semibold text-moss-900">
              {unitPrice.toLocaleString()}
            </span>
            {qty > 1 && (
              <span className="text-[11px] text-moss-500">×{qty} = ¥{total.toLocaleString()}</span>
            )}
          </div>
          <button
            onClick={onToggleWish}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
              wishlisted
                ? "border-blush-400 bg-blush-50 text-blush-600"
                : "border-cream-200 text-moss-600 hover:text-blush-500",
            )}
            aria-label="收藏"
          >
            <HeartIcon className="h-4.5 w-4.5" filled={wishlisted} />
          </button>
          <button
            onClick={() => onAddToCart({ qty, spec: currentSpec.name, total })}
            className="flex items-center gap-2 rounded-full border border-moss-700 bg-white px-5 py-3 text-[13.5px] tracking-wider text-moss-700 transition-colors hover:bg-moss-50 sm:px-6"
          >
            <CartIcon className="h-4 w-4" />
            加入购物车
          </button>
          <button
            onClick={onBuyNow}
            className="flex items-center gap-2 rounded-full bg-moss-700 px-5 py-3 font-serif text-[13.5px] tracking-[0.14em] text-cream-50 transition-colors hover:bg-moss-900 sm:px-7"
          >
            <FlowerIcon className="h-4 w-4" />
            立即购买
          </button>
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const cols = [
    {
      title: "花礼选购",
      links: ["告白玫瑰", "生日花束", "开业花篮", "永生花礼盒", "婚礼手捧", "企业订阅"],
    },
    {
      title: "服务支持",
      links: ["配送范围查询", "养护指南", "售后政策", "订单追踪", "匿名配送说明", "发票开具"],
    },
    {
      title: "关于拾花集",
      links: ["品牌故事", "门店地址", "花艺课程", "加入我们", "媒体报道", "合作洽谈"],
    },
  ];

  return (
    <footer className="mt-20 border-t border-cream-200 bg-cream-100/60">
      <div className="mx-auto max-w-[1280px] px-4 pt-14 pb-32 sm:px-6 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-moss-500/30 text-moss-600">
                <FlowerIcon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-serif text-lg font-semibold tracking-[0.18em] text-moss-900">
                  拾花集
                </span>
                <span className="mt-0.5 block font-display text-[10px] tracking-[0.32em] text-moss-500">
                  PETALS &amp; POEMS
                </span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-[12.5px] leading-relaxed text-moss-600">
              一家开在城西万象城旁的小花店。我们相信花不是商品，是替你说出口的那句话。
            </p>
            <p className="mt-5 font-display text-[13px] tracking-[0.14em] text-moss-700">
              400-820-1024
            </p>
            <p className="mt-1 text-[11.5px] text-moss-500">每日 08:00 – 22:00 · 花艺师在线</p>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <p className="font-serif text-[14px] font-semibold tracking-wide text-moss-900">
                {c.title}
              </p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[12.5px] text-moss-600 transition-colors hover:text-blush-600"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-cream-200 pt-6 text-[11px] text-moss-500 sm:flex-row">
          <p>© 2016–2026 拾花集花艺工作室 · 沪 ICP 备 20161024 号</p>
          <p className="flex items-center gap-4">
            <span>隐私政策</span>
            <span className="h-3 w-px bg-cream-200" />
            <span>服务条款</span>
            <span className="h-3 w-px bg-cream-200" />
            <span className="font-display tracking-[0.2em]">MADE WITH BLOOM</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
