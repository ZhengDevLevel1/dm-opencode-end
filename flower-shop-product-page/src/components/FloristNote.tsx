import { useMemo } from "react";
import { gallery } from "@/data/product";
import ZoomImage from "@/components/ZoomImage";
import { FlowerIcon } from "@/components/icons";

const TAG_SETS = [
  ["每日凌晨花市直采", "非冷藏库存花", "花艺师当日现做", "7 天花期保障"],
  ["凌晨直采", "不卖陈花", "手写贺卡", "7 天花期保障"],
  ["18 小时冷链", "当日现做", "送达拍照", "不新鲜免费重做"],
  ["花市直采", "指定时段", "匿名配送", "售后无忧"],
];

type Layout =
  | "dots"
  | "quotemark"
  | "photo"
  | "letter"
  | "blush"
  | "frame"
  | "numbered"
  | "stripes"
  | "editorial"
  | "night";

type Note = {
  layout: Layout;
  eyebrow: string;
  quote: string;
  sign: string;
  tags: string[];
};

const notes: Note[] = [
  {
    layout: "dots",
    eyebrow: "A NOTE FROM OUR FLORIST",
    quote:
      "我不太会说话，所以我选了很多花。希望你看到它们的时候，能听见我没说出口的那部分。",
    sign: "—— 主理人 / 拾花 · 2016 年起在城西的花台前",
    tags: TAG_SETS[0],
  },
  {
    layout: "quotemark",
    eyebrow: "花艺师手记 · NO.02",
    quote:
      "一束花的保质期只有七天，但它替你说出口的那句话，可以记很久。所以我们宁可少赚一点，也要让每朵花在离开花店时是干净的。",
    sign: "—— 拾花集 · 城西万象城店",
    tags: TAG_SETS[2],
  },
  {
    layout: "photo",
    eyebrow: "AT THE MARKET",
    quote:
      "凌晨的花市很吵，我在那里挑了十年。因为花不会撒谎：叶子是挺的，茎是硬的，香气是活的。",
    sign: "—— 主理人 拾花 · 每日 04:30 到场",
    tags: TAG_SETS[0],
  },
  {
    layout: "letter",
    eyebrow: "A HAND-WRITTEN LETTER",
    quote:
      "送花这件事，从来不是把一束东西交出去。是把一整天的耐心、一次反复核对的地址、和一句想了很久的措辞，一起递到别人手里。",
    sign: "—— 拾花集 · 致每一位下单的人",
    tags: TAG_SETS[3],
  },
  {
    layout: "blush",
    eyebrow: "WHY WE CHOOSE LOCAL",
    quote:
      "有人问我要不要换成更便宜的进口花。我不要。我想你收到它的时候，它还是凉的。",
    sign: "—— 主理人 拾花 · 昆明花市第 1,426 次进货",
    tags: TAG_SETS[1],
  },
  {
    layout: "frame",
    eyebrow: "拾花集 · 花艺信条",
    quote:
      "玫瑰有很多种颜色，可我最想记住的，永远是它刚离开花市时、指尖上那一点点凉。",
    sign: "—— 拾花集花艺工作室 · 自 2016 年",
    tags: TAG_SETS[0],
  },
  {
    layout: "numbered",
    eyebrow: "BEHIND THE BUNCH",
    quote:
      "我做花的时候很少说话，手一直在忙。你要说的，我替你说。剩下的，交给这束花。",
    sign: "—— 花艺师 小鹿 · 加入拾花集第 5 年",
    tags: TAG_SETS[2],
  },
  {
    layout: "stripes",
    eyebrow: "A SMALL STATION",
    quote:
      "花店不是卖花的地方，是有人愿意停下来、认真想一个人的地方。",
    sign: "—— 拾花集 · 城西万象城 1F-L118",
    tags: TAG_SETS[3],
  },
  {
    layout: "editorial",
    eyebrow: "FIELD NOTES · 04",
    quote:
      "如果这束花没有开得很好，请你先别难过——它只是有点紧张。给它一夜清水和一点凉风，明早它会自己努力。",
    sign: "—— 花艺师 阿禾 · 养护卡片第 3 版撰写人",
    tags: TAG_SETS[1],
  },
  {
    layout: "night",
    eyebrow: "SOME WORDS I COULD NOT SAY",
    quote:
      "有些话我说不出口，所以我把它们包进花里。你拆开的那一刻，就算我当面讲过一次了。",
    sign: "—— 主理人 拾花 · 于城西的花台前",
    tags: TAG_SETS[0],
  },
];

function TagRow({ tags, tone }: { tags: string[]; tone: "light" | "dark" }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {tags.map((t) => (
        <span
          key={t}
          className={
            tone === "light"
              ? "flex items-center gap-1.5 rounded-full border border-cream-50/20 px-3.5 py-1.5 text-[11.5px] text-cream-100"
              : "flex items-center gap-1.5 rounded-full bg-cream-100 px-3.5 py-1.5 text-[11.5px] text-moss-600"
          }
        >
          <FlowerIcon
            className={`h-3.5 w-3.5 ${tone === "light" ? "text-blush-200" : "text-blush-400"}`}
          />
          {t}
        </span>
      ))}
    </div>
  );
}

export default function FloristNote() {
  const note = useMemo(() => notes[Math.floor(Math.random() * notes.length)], []);
  const { eyebrow, quote, sign, tags, layout } = note;

  const Eyebrow = ({ tone }: { tone: "light" | "dark" }) => (
    <p
      className={
        tone === "light"
          ? "font-display text-[10px] tracking-[0.36em] text-blush-200"
          : "font-display text-[10px] tracking-[0.36em] text-blush-500"
      }
    >
      {eyebrow}
    </p>
  );

  const Sign = ({ tone }: { tone: "light" | "dark" }) => (
    <p
      className={
        tone === "light"
          ? "mt-6 text-[12px] tracking-[0.2em] text-cream-200/70"
          : "mt-6 border-t border-cream-200 pt-5 text-[12px] tracking-[0.18em] text-moss-500"
      }
    >
      {sign}
    </p>
  );

  switch (layout) {
    /* 1 — dark gradient + dot texture */
    case "dots":
      return (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-moss-700 via-moss-600 to-moss-900 px-6 py-14 text-center sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 60%, #fff 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <Eyebrow tone="light" />
          <blockquote className="relative mx-auto mt-5 max-w-2xl font-serif text-xl leading-[1.85] text-cream-50 text-balance sm:text-2xl">
            「{quote}」
          </blockquote>
          <Sign tone="light" />
          <div className="flex justify-center">
            <TagRow tags={tags} tone="light" />
          </div>
        </section>
      );

    /* 2 — oversized guillemet on paper white */
    case "quotemark":
      return (
        <section className="relative overflow-hidden rounded-2xl border border-cream-200 bg-white px-6 py-14 sm:px-14 sm:py-16">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 left-4 font-display text-[180px] leading-none text-blush-100 select-none"
          >
            “
          </span>
          <div className="relative">
            <Eyebrow tone="dark" />
            <blockquote className="mt-4 max-w-3xl font-serif text-2xl leading-[1.95] text-moss-900 text-balance sm:text-[28px]">
              {quote}
            </blockquote>
            <Sign tone="dark" />
            <TagRow tags={tags} tone="dark" />
          </div>
        </section>
      );

    /* 3 — photo left, copy right */
    case "photo":
      return (
        <section className="grid overflow-hidden rounded-2xl border border-cream-200 bg-white sm:grid-cols-[1fr_1.15fr]">
          <div className="relative min-h-[240px]">
            <ZoomImage
              src={gallery[2].src}
              alt="花艺师在工作台前整理花材"
              wrapperClassName="absolute inset-0"
              className="h-full w-full object-cover"
              zoom={1.6}
              veil={
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-moss-900/30 to-transparent" />
              }
            />
          </div>
          <div className="flex flex-col justify-center gap-4 p-7 sm:p-10">
            <Eyebrow tone="dark" />
            <blockquote className="font-serif text-xl leading-[1.9] text-moss-900 text-balance sm:text-[22px]">
              {quote}
            </blockquote>
            <Sign tone="dark" />
            <TagRow tags={tags} tone="dark" />
          </div>
        </section>
      );

    /* 4 — tilted letter card */
    case "letter":
      return (
        <section className="rounded-2xl bg-gradient-to-br from-cream-100 to-blush-50 px-5 py-14 sm:px-16 sm:py-16">
          <div className="relative mx-auto max-w-2xl rotate-[-1.2deg] bg-white px-7 py-10 shadow-[0_28px_60px_-38px_rgba(20,32,26,0.75)] sm:px-10">
            <span
              aria-hidden
              className="absolute -top-4 right-6 flex h-12 w-12 rotate-[8deg] items-center justify-center rounded-full border-2 border-dashed border-blush-400/70 bg-cream-50 font-display text-[10px] tracking-widest text-blush-500"
            >
              拾花
            </span>
            <Eyebrow tone="dark" />
            <blockquote className="mt-4 font-serif text-lg leading-[2.1] text-moss-800 text-balance sm:text-xl">
              {quote}
            </blockquote>
            <Sign tone="dark" />
            <div className="mt-5 flex items-center gap-3">
              <FlowerIcon className="h-5 w-5 text-blush-400" />
              <span className="font-display text-[13px] tracking-[0.2em] text-moss-600">
                Shihua Studio
              </span>
            </div>
          </div>
        </section>
      );

    /* 5 — blush wash + giant numeral */
    case "blush":
      return (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blush-100 via-blush-50 to-cream-100 px-6 py-14 sm:px-14 sm:py-16">
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-16 right-0 font-display text-[190px] leading-none text-white/80 select-none"
          >
            05
          </span>
          <div className="relative">
            <Eyebrow tone="dark" />
            <blockquote className="mt-5 max-w-2xl font-serif text-2xl leading-[1.85] text-moss-900 text-balance sm:text-[30px]">
              {quote}
            </blockquote>
            <Sign tone="dark" />
            <TagRow tags={tags} tone="dark" />
          </div>
        </section>
      );

    /* 6 — formal double frame */
    case "frame":
      return (
        <section className="rounded-2xl border border-cream-200 bg-cream-50 p-1.5">
          <div className="rounded-xl border border-moss-600/25 px-6 py-14 text-center sm:px-16 sm:py-16">
            <div className="flex justify-center">
              <FlowerIcon className="h-6 w-6 text-moss-600" />
            </div>
            <Eyebrow tone="dark" />
            <blockquote className="mx-auto mt-5 max-w-2xl font-serif text-xl leading-[1.9] text-moss-900 text-balance sm:text-[26px]">
              「{quote}」
            </blockquote>
            <p className="mx-auto mt-6 max-w-md text-[12px] leading-relaxed tracking-[0.14em] text-moss-500">
              {sign}
            </p>
            <div className="mx-auto mt-6 h-px w-16 bg-moss-600/30" />
            <div className="flex justify-center">
              <TagRow tags={tags} tone="dark" />
            </div>
          </div>
        </section>
      );

    /* 7 — solid moss with oversized index number */
    case "numbered":
      return (
        <section className="grid gap-5 rounded-2xl bg-moss-700 px-6 py-12 text-cream-50 sm:grid-cols-[auto_1fr] sm:gap-12 sm:px-12 sm:py-14">
          <div className="flex items-center">
            <span className="font-display text-[72px] leading-none text-blush-200/75 sm:text-[96px]">
              07
            </span>
          </div>
          <div className="flex flex-col justify-center">
            <Eyebrow tone="light" />
            <blockquote className="mt-4 font-serif text-xl leading-[1.9] text-cream-50 text-balance sm:text-[23px]">
              {quote}
            </blockquote>
            <Sign tone="light" />
            <TagRow tags={tags} tone="light" />
          </div>
        </section>
      );

    /* 8 — diagonal stripe field */
    case "stripes":
      return (
        <section className="relative overflow-hidden rounded-2xl bg-moss-600 px-6 py-14 sm:px-14 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, #14201a 0 1.5px, transparent 1.5px 16px)",
            }}
          />
          <div className="relative max-w-2xl">
            <Eyebrow tone="light" />
            <blockquote className="mt-5 font-serif text-[26px] leading-[1.55] font-semibold text-cream-50 text-balance sm:text-[34px]">
              {quote}
            </blockquote>
            <Sign tone="light" />
            <TagRow tags={tags} tone="light" />
          </div>
        </section>
      );

    /* 9 — editorial two-column with drop cap */
    case "editorial":
      return (
        <section className="grid gap-7 border-y border-cream-200 py-12 sm:grid-cols-[190px_1fr] sm:gap-12">
          <div className="border-l-2 border-blush-400 pl-4">
            <Eyebrow tone="dark" />
            <p className="mt-4 font-display text-[15px] leading-relaxed tracking-[0.14em] text-moss-700">
              {sign}
            </p>
          </div>
          <div>
            <blockquote className="font-serif text-lg leading-[2.05] text-moss-800 text-balance first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-[68px] first-letter:leading-[0.8] first-letter:text-blush-500 sm:text-xl">
              {quote}
            </blockquote>
            <div className="mt-6">
              <TagRow tags={tags} tone="dark" />
            </div>
          </div>
        </section>
      );

    /* 10 — moody photo backdrop */
    default:
      return (
        <section className="relative overflow-hidden rounded-2xl">
          <ZoomImage
            src={gallery[4].src}
            alt="花艺师现场制作花束"
            wrapperClassName="absolute inset-0"
            className="h-full w-full object-cover"
            zoom={1.6}
            veil={
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-moss-900/92 via-moss-900/72 to-moss-900/30" />
            }
          />
          <div className="relative px-7 py-16 sm:px-14 sm:py-20">
            <div className="max-w-xl">
              <Eyebrow tone="light" />
              <blockquote className="mt-5 font-serif text-xl leading-[1.9] text-cream-50 text-balance sm:text-[24px]">
                {quote}
              </blockquote>
              <Sign tone="light" />
              <TagRow tags={tags} tone="light" />
            </div>
          </div>
        </section>
      );
  }
}
