import { useState } from "react";
import { cn } from "@/utils/cn";
import { careSteps, flowers, product, gallery } from "@/data/product";
import Reviews from "@/components/Reviews";
import ZoomImage from "@/components/ZoomImage";
import { SectionHeading, SubHeading } from "@/components/ui";
import { FlowerIcon, LeafIcon } from "@/components/icons";

const tabs = [
  { id: "detail", label: "设计详情" },
  { id: "care", label: "养护指南" },
  { id: "delivery", label: "配送与售后" },
  { id: "reviews", label: "用户评价" },
];

const attrs: [string, string][] = [
  ["主花材", "粉荔枝玫瑰、蝴蝶洋牡丹、白桔梗"],
  ["花束尺寸", "告白款直径约 32cm · 高约 48cm"],
  ["包装方式", "韩式雾面双折包装 + 手工真丝缎带"],
  ["适用场合", "告白 · 求婚 · 生日 · 纪念日 · 探病慰问"],
  ["保存时长", "正确养护下 7–10 天"],
  ["随赠配件", "手写贺卡 ×1、保鲜剂 ×2、养护说明卡 ×1"],
];

export default function DetailTabs() {
  const [tab, setTab] = useState("detail");

  return (
    <section id="detail" className="flex flex-col gap-10">
      {/* Tab bar */}
      <div className="sticky top-[152px] z-20 -mx-4 border-y border-cream-200 bg-cream-50/95 px-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-10 lg:top-[160px] lg:px-10">
        <div className="no-scrollbar mx-auto flex max-w-[1280px] items-center gap-1 overflow-x-auto">
          {tabs.map((t, i) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative shrink-0 px-4 py-4 font-serif text-[14px] tracking-[0.14em] transition-colors sm:px-6",
                  on ? "text-moss-900" : "text-moss-500 hover:text-moss-700",
                )}
              >
                <span
                  className={cn(
                    "num mr-2 font-display text-[10px] tracking-[0.16em] transition-colors",
                    on ? "text-brass-500" : "text-brass-300/70",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t.label}
                <span
                  className={cn(
                    "absolute inset-x-4 bottom-0 h-[2px] rounded-full transition-all duration-300",
                    on ? "bg-brass-500 opacity-100" : "bg-moss-700 opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-fade-up">
        {tab === "detail" && (
          <div className="flex flex-col gap-12">
            {/* Story */}
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
              <div>
                <SectionHeading kicker="Design Notes" title="关于「初见」的设计自述" />
                <p className="mt-6 text-[14px] leading-[2.15] text-moss-700">{product.story}</p>
                <p className="mt-5 border-l-2 border-brass-300 bg-gradient-to-r from-brass-100/50 to-transparent py-3 pl-4 text-[13.5px] leading-[1.95] text-moss-700 italic">
                  {product.highlight}
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {["粉荔枝玫瑰 ×12", "蝴蝶洋牡丹 ×7", "白桔梗 ×8", "奶油奥斯汀 ×4", "尤加利 ×6"].map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-1.5 rounded-full bg-moss-50 px-3 py-1.5 text-[11.5px] text-moss-600"
                    >
                      <FlowerIcon className="h-3.5 w-3.5 text-moss-500" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[320px] overflow-hidden rounded-2xl">
                <ZoomImage
                  src={gallery[4].src}
                  alt="花艺师现场制作"
                  wrapperClassName="absolute inset-0"
                  className="h-full w-full object-cover"
                  zoom={1.6}
                  veil={
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-moss-900/60 via-transparent to-transparent" />
                  }
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
                  <p className="font-display text-[10px] tracking-[0.3em] text-cream-200">
                    IN-STUDIO · 每一束皆为当日现做
                  </p>
                  <p className="mt-2 font-serif text-lg text-cream-50">
                    下单后 90 分钟内，由驻店花艺师亲手完成
                  </p>
                </div>
              </div>
            </div>

            {/* Attributes table */}
            <div>
              <SubHeading index="01" title="规格参数" note="Measured & specified" />
              <dl className="grid gap-x-10 sm:grid-cols-2">
                {attrs.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex gap-4 border-b border-cream-200 py-3.5 text-[13px] sm:w-full"
                  >
                    <dt className="w-20 shrink-0 text-moss-500">{k}</dt>
                    <dd className="flex-1 text-moss-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Flower list cards */}
            <div>
              <SubHeading index="02" title="花材构成" note="Stem by stem" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {flowers.map((f) => (
                  <div
                    key={f.name}
                    className="group flex items-start gap-3 rounded-xl border border-cream-200 bg-white p-4 transition-all hover:border-blush-400/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-50 text-moss-600">
                      <LeafIcon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-moss-900">{f.name}</p>
                      <p className="mt-0.5 font-display text-[10px] tracking-wider text-moss-500/70 uppercase">
                        {f.latin}
                      </p>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-moss-600">
                        {f.count} 枝 · {f.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-moss-500">
                * 部分花材受季节与产地影响，若缺货将以同等价位的近似花材替换，并在发货前以短信告知，恕不另行确认。
              </p>
            </div>
          </div>
        )}

        {tab === "care" && (
          <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
            <div>
              <SectionHeading
                kicker="Care Ritual"
                title="让它们开得更久一点"
                sub="玫瑰是娇气的，但只要遵守下面四件小事，它们会用整整一周的盛放回报你。"
              />
              <ol className="mt-8 flex flex-col gap-5">
                {careSteps.map((s) => (
                  <li key={s.step} className="flex gap-5">
                    <span className="font-display text-2xl leading-none text-blush-200">
                      {s.step}
                    </span>
                    <div className="border-l border-cream-200 pl-5">
                      <p className="font-serif text-[16px] font-semibold text-moss-900">{s.title}</p>
                      <p className="mt-1.5 text-[13.5px] leading-[1.9] text-moss-700">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="flex flex-col gap-4 self-start rounded-2xl border border-cream-200 bg-white p-6">
              <p className="font-display text-[10px] tracking-[0.3em] text-blush-500">
                TROUBLESHOOTING
              </p>
              <p className="font-serif text-lg font-semibold text-moss-900">常见小状况</p>
              <ul className="flex flex-col gap-4 text-[12.5px] leading-relaxed text-moss-700">
                <li>
                  <span className="font-medium text-moss-900">花头下垂：</span>
                  剪根后深水浸泡 1 小时（水位到花头下），多数可在 2 小时内恢复挺立。
                </li>
                <li>
                  <span className="font-medium text-moss-900">外层花瓣发软：</span>
                  玫瑰外层为「保护瓣」，属正常现象，请勿摘除，可轻拨整理即可。
                </li>
                <li>
                  <span className="font-medium text-moss-900">水质发浑：</span>
                  立即洗瓶换水并再次剪根 1cm，避免细菌堵塞导管。
                </li>
                <li>
                  <span className="font-medium text-moss-900">想风干保存：</span>
                  在最美的一天倒挂于阴凉通风处，两周后即为天然干花。
                </li>
              </ul>
            </aside>
          </div>
        )}

        {tab === "delivery" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "配送范围与时效",
                items: [
                  "市中心六区：当日 14:00 前下单，3 小时内送达",
                  "近郊区域：次日 12:00 前送达",
                  "全国配送：永生花与干花礼盒可发顺丰空运",
                ],
              },
              {
                title: "指定时段惊喜",
                items: [
                  "可精确到 30 分钟区间，如 19:30–20:00",
                  "支持「先联系收花人确认在址」或「完全保密」",
                  "夜间 21:00 后配送需补 20 元加急费",
                ],
              },
              {
                title: "售后与保障",
                items: [
                  "到手花材不新鲜：照片反馈后免费重做",
                  "配送损坏：全额退款或当日补发",
                  "7 天内花瓣大量脱落，可申请部分补偿",
                ],
              },
              {
                title: "企业 / 团体订单",
                items: [
                  "5 束以上享 88 折，可开具增值税专票",
                  "门店月度订阅：每周一束，起订 4 周",
                  "活动花艺布置可预约上门勘察",
                ],
              },
              {
                title: "门店与自提",
                items: [
                  "拾花集 · 城西万象城店（10:00–22:00）",
                  "自提享 95 折，需提前 2 小时下单",
                  "可预约现场观摩花艺师制作",
                ],
              },
              {
                title: "发票与支付",
                items: [
                  "支持微信、支付宝、银联与分期",
                  "电子普票默认随订单发送至邮箱",
                  "礼品卡与储值卡可抵扣运费以外的全部金额",
                ],
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-cream-200 bg-white p-6">
                <p className="font-serif text-[16px] font-semibold text-moss-900">{c.title}</p>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {c.items.map((it) => (
                    <li key={it} className="flex gap-2.5 text-[12.5px] leading-relaxed text-moss-700">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blush-400" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === "reviews" && <Reviews />}
      </div>
    </section>
  );
}
