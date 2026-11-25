import { product, related } from "@/data/product";
import { SectionHeading } from "@/components/ui";
import { StarIcon, ChevronRight } from "@/components/icons";

export function RelatedProducts() {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeading
        index="05"
        kicker="You may also love"
        title="常被一起带走的它们"
        className="border-b border-cream-200 pb-6"
        action={
          <button className="group flex shrink-0 items-center gap-1.5 rounded-full border border-cream-200 bg-white px-4 py-2 text-[12px] tracking-wider text-moss-600 transition-all hover:border-brass-300 hover:text-moss-900">
            浏览全部花礼
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {related.map((r) => (
          <article
            key={r.id}
            className="group cursor-pointer transition-transform duration-500 group-hover:-translate-y-1.5"
          >
            <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-cream-100 ring-1 ring-cream-200/70 shadow-[0_26px_54px_-42px_rgba(20,32,26,0.85)] transition-all duration-500 group-hover:shadow-[0_40px_66px_-36px_rgba(20,32,26,0.9)]">
              <img
                src={r.img}
                alt={r.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span
                className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] tracking-[0.12em] ${r.tagColor}`}
              >
                {r.tag}
              </span>
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-moss-900/80 py-2.5 text-center text-[11.5px] tracking-widest text-cream-50 backdrop-blur transition-transform duration-300 group-hover:translate-y-0">
                立即查看详情
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-[13.5px] font-medium leading-snug text-moss-900 group-hover:text-blush-600">
                {r.name}
              </p>
              <p className="text-[11px] text-moss-500">{r.desc}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-serif text-base font-semibold text-moss-900">
                  ¥{r.price.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-[10.5px] text-moss-500">
                  <StarIcon className="h-2.5 w-2.5 text-blush-400" />4.8
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Bundled suggestion */}
      <div className="mt-2 flex flex-col items-start gap-6 rounded-2xl border border-cream-200 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex -space-x-4">
          <img
            src={related[1].img}
            alt=""
            className="h-16 w-16 rounded-lg object-cover ring-4 ring-white"
            loading="lazy"
          />
          <img
            src={related[2].img}
            alt=""
            className="h-16 w-16 rounded-lg object-cover ring-4 ring-white"
            loading="lazy"
          />
          <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-cream-100 font-display text-sm text-moss-600 ring-4 ring-white">
            +2
          </span>
        </div>
        <div className="flex-1">
          <p className="font-serif text-[17px] font-semibold text-moss-900">
            搭配一份永生花小夜灯，让心意停留更久
          </p>
          <p className="mt-1.5 text-[12.5px] text-moss-600">
            常见搭配组合已为 4,208 位顾客准备 · 组合购买较单买节省 ¥86
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-display text-[11px] text-moss-500">组合价</p>
            <p className="font-serif text-2xl font-semibold text-moss-900">
              ¥{(product.basePrice + 318).toLocaleString()}
            </p>
          </div>
          <button className="rounded-full bg-moss-700 px-6 py-3 font-serif text-[13.5px] tracking-[0.14em] text-cream-50 transition-colors hover:bg-moss-900">
            一键加购
          </button>
        </div>
      </div>
    </section>
  );
}
