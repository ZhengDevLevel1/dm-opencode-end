import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { useProduct } from "@/state";
import TimePicker from "@/components/TimePicker";
import { FieldLabel } from "@/components/ui";
import { product, specs, wraps, flowers, services } from "@/data/product";

const pad = (n: number) => String(n).padStart(2, "0");

const presets: { h: number; m: number; label: string }[] = [
  { h: 9, m: 0, label: "开门单" },
  { h: 12, m: 0, label: "午间" },
  { h: 15, m: 0, label: "下午" },
  { h: 18, m: 0, label: "下班惊喜" },
];
import {
  CardIcon,
  CheckIcon,
  ChevronRight,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
  iconMap,
} from "@/components/icons";

type Props = {
  onAddToCart: (payload: { qty: number; spec: string; total: number }) => void;
  onBuyNow: () => void;
  wishlisted: boolean;
  onToggleWish: () => void;
};

function useDates() {
  return useMemo(() => {
    const days = ["日", "一", "二", "三", "四", "五", "六"];
    const out: { key: string; day: string; date: string; tag: string; sold: boolean }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      out.push({
        key,
        day: i === 0 ? "今天" : i === 1 ? "明日" : `周${days[d.getDay()]}`,
        date: String(d.getDate()),
        tag: i === 0 ? "3 小时达" : `${d.getMonth() + 1}月`,
        sold: d.getDay() === 0 && i > 2,
      });
    }
    return out;
  }, []);
}

export default function PurchasePanel({ onAddToCart, onBuyNow, wishlisted, onToggleWish }: Props) {
  const { spec, setSpec, wrap, setWrap, qty, setQty, currentSpec, currentWrap, unitPrice, total, saved } =
    useProduct();
  const [date, setDate] = useState("today");
  const [time, setTime] = useState({ h: 14, m: 30 });
  const [cardText, setCardText] = useState("愿你被这个世界温柔以待，也愿我一直是那阵温柔。");
  const [cardOn, setCardOn] = useState(true);
  const [showFlowers, setShowFlowers] = useState(false);

  const dates = useDates();

  const selectedDate = date === "today" ? dates[0].key : date;

  const totalStems = flowers.reduce((a, f) => a + f.count, 0);

  return (
    <div className="flex flex-col gap-7">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-moss-500">
        <span className="transition-colors hover:text-moss-700">首页</span>
        <span className="text-cream-200">/</span>
        <span className="transition-colors hover:text-moss-700">告白玫瑰</span>
        <span className="text-cream-200">/</span>
        <span className="transition-colors hover:text-moss-700">混搭花束</span>
        <span className="text-cream-200">/</span>
        <span className="text-moss-900">{product.name}</span>
      </nav>

      {/* Title block */}
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-1.5 rounded-full border border-moss-100 bg-moss-50/70 px-3 py-1 text-[10.5px] tracking-[0.16em] text-moss-600">
            <ShieldIcon className="h-3.5 w-3.5" />
            {product.brand}
          </span>
          <span className="num font-display text-[11px] tracking-[0.26em] text-brass-500">
            {product.sku}
          </span>
        </div>

        <h1 className="mt-5 font-serif text-[32px] leading-[1.16] font-semibold tracking-[-0.02em] text-moss-900 text-balance sm:text-[40px] lg:text-[44px]">
          {product.name}
        </h1>
        <p className="mt-3.5 font-display text-[13px] tracking-[0.16em] text-moss-500 sm:text-[15px]">
          {product.subtitle}
        </p>

        {/* Rating row */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-cream-200 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="flex text-blush-500">
              {[0, 1, 2, 3, 4].map((i) => (
                <StarIcon key={i} className="h-3.5 w-3.5" />
              ))}
            </span>
            <span className="text-sm font-semibold text-moss-900">{product.rating}</span>
          </div>
          <span className="text-xs text-moss-500">
            <span className="border-b border-dashed border-moss-500/40 pb-0.5 text-moss-700">
              {product.reviewCount.toLocaleString()} 条评价
            </span>
          </span>
          <span className="text-xs text-moss-500">
            已售 <span className="text-moss-900">{product.soldCount.toLocaleString()}</span> 件
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-blush-600">
            <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-blush-500" />
            仅剩 {product.stock} 份现货
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blush-50 via-cream-50 to-white p-5 ring-1 ring-cream-200 sm:p-6">
        <span
          aria-hidden
          className="num pointer-events-none absolute -top-10 -right-4 font-display text-[130px] leading-none text-blush-100/60 select-none"
        >
          ¥
        </span>
        <div className="relative flex flex-wrap items-end gap-x-3 gap-y-2">
          <span className="font-display text-[20px] leading-none text-blush-600">¥</span>
          <span className="num font-display text-[54px] leading-[0.82] font-semibold tracking-tight text-moss-900 sm:text-[60px]">
            {unitPrice.toLocaleString()}
          </span>
          <span className="num pb-1.5 text-sm text-moss-500 line-through">
            ¥{product.originalPrice.toLocaleString()}
          </span>
          <span className="ml-auto rounded-full bg-moss-700 px-3 py-1 text-[10.5px] tracking-[0.16em] text-cream-50">
            限时 7.5 折
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-moss-600">
          <span>已选：{currentSpec.name} / {currentWrap.name} / ×{qty}</span>
          <span className="text-moss-500">合计 ¥{total.toLocaleString()}{saved > 0 && ` · 省 ¥${saved}`}</span>
        </div>
      </div>

      {/* Spec selector */}
      <section>
        <FieldLabel index="01" title="选择规格" note={`共 ${totalStems} 枝花材`} />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {specs.map((s) => {
            const on = s.id === spec;
            return (
              <button
                key={s.id}
                onClick={() => setSpec(s.id)}
                className={cn(
                  "group relative flex flex-col items-start gap-1.5 overflow-visible rounded-xl border px-4 py-3.5 text-left transition-all duration-300",
                  on
                    ? "-translate-y-0.5 border-moss-700 bg-moss-700 shadow-[0_18px_36px_-20px_rgba(20,32,26,0.95)]"
                    : "border-cream-200 bg-white/85 hover:-translate-y-0.5 hover:border-brass-300 hover:shadow-[0_14px_30px_-22px_rgba(20,32,26,0.7)]",
                )}
              >
                {on && (
                  <span className="absolute -right-2 -top-2 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-brass-500 text-moss-900 ring-2 ring-cream-50">
                    <CheckIcon className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <span
                  className={cn(
                    "text-[13px] font-medium tracking-tight",
                    on ? "text-cream-50" : "text-moss-900",
                  )}
                >
                  {s.name}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    on ? "text-cream-100/70" : "text-moss-500",
                  )}
                >
                  {s.desc}
                </span>
                <span
                  className={cn(
                    "num mt-1 font-display text-[15px] tracking-wide",
                    on ? "text-brass-300" : "text-blush-600",
                  )}
                >
                  ¥{(product.basePrice + s.priceDelta).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Wrap colour */}
      <section>
        <FieldLabel
          index="02"
          title="包装色系"
          note={`${currentWrap.name} · ${currentWrap.desc}`}
        />
        <div className="mt-3 flex flex-wrap gap-2.5">
          {wraps.map((w) => {
            const on = w.id === wrap;
            return (
              <button
                key={w.id}
                onClick={() => setWrap(w.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 transition-all duration-200",
                  on
                    ? "border-moss-600 bg-white shadow-[0_4px_14px_-10px_rgba(36,56,42,0.6)]"
                    : "border-cream-200 hover:border-moss-500/40",
                )}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: w.hex, boxShadow: `inset 0 0 0 1px ${w.ring}` }}
                >
                  {on && (
                    <CheckIcon
                      className={cn("h-3.5 w-3.5", w.id === "ink" ? "text-cream-50" : "text-moss-900")}
                    />
                  )}
                </span>
                <span className="text-[13px] text-moss-900">{w.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Flower list accordion */}
      <section className="overflow-hidden rounded-xl border border-cream-200 bg-white">
        <button
          onClick={() => setShowFlowers((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 font-serif text-[15px] font-semibold tracking-wide text-moss-900">
            花材清单
            <span className="font-sans text-[11px] font-normal text-moss-500">
              {flowers.length} 种 · {totalStems} 枝 · 因季节可能等价替换
            </span>
          </span>
          <ChevronRight
            className={cn("h-4 w-4 shrink-0 text-moss-500 transition-transform", showFlowers && "rotate-90")}
          />
        </button>
        {showFlowers && (
          <ul className="animate-fade-up divide-y divide-cream-100 border-t border-cream-200">
            {flowers.map((f) => (
              <li key={f.name} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 rounded bg-cream-100 px-1.5 py-0.5 font-display text-[11px] text-moss-600">
                  ×{f.count}
                </span>
                <div>
                  <p className="text-[13px] text-moss-900">
                    {f.name}
                    <span className="ml-2 font-display text-[11px] tracking-wider text-moss-500/70">
                      {f.latin}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-moss-500">{f.note}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Delivery date */}
      <section>
        <FieldLabel
          index="03"
          title="选择具体的送达时间"
          note={`已选 ${selectedDate} ${pad(time.h)}:${pad(time.m)}`}
        />
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {dates.map((d) => {
            const key = d.tag === "3 小时达" ? "today" : d.key;
            const on = date === key;
            return (
              <button
                key={d.key}
                disabled={d.sold}
                onClick={() => setDate(key)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition-all duration-200",
                  d.sold && "cursor-not-allowed opacity-40",
                  on
                    ? "border-moss-600 bg-moss-50 shadow-[0_6px_18px_-12px_rgba(36,56,42,0.45)]"
                    : "border-cream-200 bg-white hover:border-moss-500/40",
                )}
              >
                <span className="font-display text-[10px] tracking-wider text-blush-600">
                  {d.tag}
                </span>
                <span className={cn("text-[13px] font-medium", on ? "text-moss-900" : "text-moss-700")}>
                  {d.day}
                </span>
                <span className="font-display text-[11px] text-moss-500">{d.date} 日</span>
              </button>
            );
          })}
        </div>

        {/* Hour / minute / second wheel — 09:00 – 20:00 */}
        <div className="mt-4 rounded-2xl border border-cream-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-baseline gap-0.5 font-display lining-nums tabular-nums text-[46px] leading-none font-semibold tracking-tight text-moss-900 sm:text-[54px]">
              <span>{pad(time.h)}</span>
              <span className="text-blush-400">:</span>
              <span>{pad(time.m)}</span>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-moss-700">
                <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-moss-500" />
                营业时间 09:00 – 20:00
              </span>
              <span className="text-[11px] text-moss-500">按分钟预约 · 建议提前 1 小时下单</span>
            </div>
          </div>

          <div className="mt-4">
            <TimePicker value={time} onChange={setTime} />
          </div>

          {/* quick presets */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cream-100 pt-4">
            <span className="mr-1 text-[11px] tracking-wider text-moss-500">常用时刻</span>
            {presets.map((p) => {
              const on = time.h === p.h && time.m === p.m;
              return (
                <button
                  key={p.h}
                  onClick={() => setTime({ h: p.h, m: p.m })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[11.5px] transition-all",
                    on
                      ? "border-blush-400 bg-blush-50 text-blush-600"
                      : "border-cream-200 text-moss-600 hover:border-blush-400/60 hover:text-blush-600",
                  )}
                >
                  {pad(p.h)}:{pad(p.m)}
                  <span className="ml-1.5 text-[10px] opacity-70">{p.label}</span>
                </button>
              );
            })}
          </div>

          {time.h === 20 ? (
            <p className="mt-3 rounded-lg bg-blush-50 px-3 py-2 text-[11.5px] leading-relaxed text-blush-600">
              20:00 为当日最后一单，分钟已自动归零。如需更晚送达，请选择其他日期。
            </p>
          ) : (
            <p className="mt-3 text-[11.5px] leading-relaxed text-moss-500">
              花艺师会在所选时间前 30 分钟完成打包；若该时刻已被约满，我们会提前 1 小时电话与你改约。
            </p>
          )}
        </div>
      </section>

      {/* Greeting card */}
      <section className="rounded-xl border border-cream-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <button
              onClick={() => setCardOn((v) => !v)}
              className={cn(
                "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                cardOn ? "bg-moss-600" : "bg-cream-200",
              )}
              aria-label="贺卡开关"
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full bg-cream-50 transition-transform duration-200",
                  cardOn && "translate-x-4",
                )}
              />
            </button>
            <span className="flex items-center gap-1.5 font-serif text-[15px] font-semibold tracking-wide text-moss-900">
              <CardIcon className="h-4 w-4 text-blush-500" />
              免费手写贺卡
            </span>
          </label>
          <span className="font-display text-[11px] tracking-widest text-moss-500">
            {cardText.length}/40
          </span>
        </div>
        {cardOn && (
          <div className="animate-fade-up mt-3">
            <textarea
              value={cardText}
              maxLength={40}
              onChange={(e) => setCardText(e.target.value)}
              rows={2}
              placeholder="写下想对 TA 说的话，我们以钢笔手写誊抄…"
              className="w-full resize-none rounded-lg border border-cream-200 bg-cream-50/60 p-3 font-serif text-[13px] leading-relaxed text-moss-900 placeholder:font-sans placeholder:text-moss-500/50 focus:border-blush-400 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["生日快乐，我的小朋友。", "余生请多指教。", "谢谢你来到我身边。"].map((t) => (
                <button
                  key={t}
                  onClick={() => setCardText(t)}
                  className="rounded-full bg-cream-100 px-2.5 py-1 text-[11px] text-moss-600 transition-colors hover:bg-blush-100 hover:text-blush-600"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Quantity + actions */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <FieldLabel index="04" title="数量" />
          <div className="flex items-center gap-1 rounded-full border border-cream-200 bg-white p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-moss-700 transition-colors hover:bg-cream-100 disabled:opacity-30"
              aria-label="减少数量"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="w-9 text-center font-display text-base text-moss-900">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-moss-700 transition-colors hover:bg-cream-100"
              aria-label="增加数量"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-stretch gap-3">
          <button
            onClick={onToggleWish}
            className={cn(
              "flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border transition-all",
              wishlisted
                ? "border-blush-400 bg-blush-50 text-blush-600"
                : "border-cream-200 bg-white text-moss-600 hover:border-blush-400 hover:text-blush-500",
            )}
            aria-label="收藏"
          >
            <HeartIcon className="h-4.5 w-4.5" filled={wishlisted} />
            <span className="text-[10px]">收藏</span>
          </button>
          <button
            onClick={() => onAddToCart({ qty, spec: currentSpec.name, total })}
            className="flex-1 rounded-xl border border-moss-700/35 bg-white py-4 font-serif text-[15px] font-semibold tracking-[0.18em] text-moss-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_26px_-20px_rgba(20,32,26,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-moss-700 hover:text-moss-900 active:translate-y-0 active:scale-[0.985]"
          >
            加入购物车
          </button>
          <button
            onClick={onBuyNow}
            className="flex-1 rounded-xl bg-gradient-to-b from-moss-600 to-moss-800 py-4 font-serif text-[15px] font-semibold tracking-[0.18em] text-cream-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_36px_-18px_rgba(20,32,26,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:from-moss-700 hover:to-moss-900 active:translate-y-0 active:scale-[0.985]"
          >
            立即购买
          </button>
        </div>
      </section>

      {/* Services */}
      <section className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-cream-200 pt-6">
        {services.map((s) => {
          const Icon = iconMap[s.icon];
          return (
            <div key={s.title} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-moss-600" />
              <div>
                <p className="text-[12px] font-medium text-moss-900">{s.title}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-moss-500">{s.desc}</p>
              </div>
            </div>
          );
        })}
        <p className="col-span-2 flex items-center gap-2 rounded-lg bg-cream-100/70 px-3 py-2.5 text-[11px] text-moss-600">
          <TruckIcon className="h-4 w-4 shrink-0 text-moss-600" />
          支持匿名配送 · 收花人不会看到价格 · 可指定「不要提前联系」
        </p>
      </section>
    </div>
  );
}
