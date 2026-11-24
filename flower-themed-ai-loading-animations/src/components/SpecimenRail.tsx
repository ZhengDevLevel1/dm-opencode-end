import { COPY, COPY_EVERY, copyIndexAt } from "./loaders";

const PALETTE = [
  { hex: "#FBF6F2", n: "纸白" },
  { hex: "#EE9BAA", n: "花屿粉" },
  { hex: "#C96A7E", n: "深玫瑰" },
  { hex: "#F9E3E8", n: "浅霞" },
  { hex: "#8FA68E", n: "叶绿" },
  { hex: "#3A2F31", n: "暖墨" },
];

const COPY_META = ["0–2.5s", "2.5–5s", "5–7.5s", "7.5–10s"];

export default function SpecimenRail({
  elapsed,
  running,
}: {
  elapsed: number;
  running: boolean;
}) {
  const idx = copyIndexAt(elapsed);

  return (
    <div className="lg:pb-24">
      <p className="font-display text-[12px] tracking-[0.34em] text-ink-soft/80">
        SPECIMEN / 等待态标本
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] tracking-[0.1em] text-ink-soft">
        {["不引起焦虑", "契合花语", "轻量不卡顿"].map((p, i) => (
          <span key={p} className="flex items-center gap-3">
            {i > 0 && <span className="h-3 w-px bg-line" />}
            <span className="text-rose-deep">{p}</span>
          </span>
        ))}
      </div>

      <p className="mt-5 max-w-[46ch] text-[14.5px] leading-[1.9] font-light text-ink-soft">
        花屿挑花顾问在「消息已发出、AI 尚未吐出第一个字」这段空窗期，只保留一个方案：
        <span className="text-ink">花茎生长</span>。它一茬一茬地重复——抽枝、结苞、倒下、重生；
        思考文案也按 2.5 秒一拍循环播放。右侧会话是活的，上面的滑块可以控制生成耗时。
      </p>

      {/* 唯一标本 */}
      <article className="relative mt-8 border-t border-b border-line py-6 pl-[68px] pr-3">
        <span className="absolute left-0 top-5 font-display text-[46px] leading-none text-rose-deep">
          01
        </span>
        <span className="absolute left-[54px] top-6 h-[calc(100%-48px)] w-[2px] bg-rose" />
        <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-serif text-[18px] font-semibold">花茎生长</span>
          <span className="font-display text-[11px] tracking-[0.2em] text-ink-soft/85">
            STEM &amp; LEAF
          </span>
          <span className="rounded-full bg-blush px-2 py-[3px] text-[10.5px] tracking-[0.08em] text-rose-deep">
            循环播放
          </span>
        </h2>
        <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-[1.85] font-light text-ink-soft">
          7 秒一周期：5.2 秒减速抽枝，叶片间隔逐渐拉大到 0.6 / 1.8 / 3.2 / 4.6 秒，顶端结苞后持续呼吸，
          随后整株轻轻倒下，新枝在原地淡入重来。它不预设生成时长，等多久都能一直长下去。
        </p>
        <p className="mt-2.5 font-display text-[11.5px] tracking-[0.12em] text-ink-soft/85">
          每 7s 重挂载重播 · 淡入抽枝 → 落下 → 再抽 · 无闪烁、无回卷 · 只用 transform / opacity / stroke-dashoffset
        </p>
      </article>

      {/* 动态文案：循环 */}
      <div className="mt-10">
        <div className="flex items-center gap-4">
          <p className="font-display text-[12px] tracking-[0.3em] text-ink-soft/80">
            COPY LOOP / 思考文案
          </p>
          <span className="h-px flex-1 bg-line" />
          <p className="text-[11.5px] font-light text-ink-soft">每 2.5s 前进一拍，走完重来</p>
        </div>
        <ul className="mt-4 space-y-2.5">
          {COPY.map((c, i) => {
            const on = running && idx === i;
            return (
              <li
                key={c}
                className={`flex items-center gap-4 rounded-2xl border px-4 py-3 transition-all duration-500 ${
                  on
                    ? "border-rose/70 bg-blush shadow-[0_12px_30px_-26px_rgba(201,106,126,0.9)]"
                    : "border-line bg-card/70"
                }`}
              >
                <span
                  className={`tabular w-[64px] shrink-0 font-display text-[14px] tracking-[0.04em] ${
                    on ? "text-rose-deep" : "text-ink-soft/85"
                  }`}
                >
                  {COPY_META[i]}
                </span>
                <span
                  className={`text-[13.5px] font-light ${on ? "text-ink" : "text-ink-soft/75"}`}
                >
                  {c}
                </span>
                {on && (
                  <span className="ml-auto flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="a-dot h-[5px] w-[5px] rounded-full bg-rose-deep"
                        style={{ animationDelay: `${d * 0.16}s` }}
                      />
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11.5px] font-light text-ink-soft">
          一拍 = {COPY_EVERY / 1000}s，四拍走完回到第一拍；秒数计时照常累加，两者互不干扰。
        </p>
      </div>

      {/* 色板 */}
      <div className="mt-10">
        <p className="font-display text-[12px] tracking-[0.3em] text-ink-soft/80">
          PALETTE / 取色
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:grid-cols-3">
          {PALETTE.map((p) => (
            <div key={p.hex} className="group">
              <div
                className="h-14 w-full rounded-lg border border-line transition-transform duration-300 group-hover:-translate-y-1"
                style={{ background: p.hex }}
              />
              <p className="mt-1.5 text-[11px] text-ink-soft">{p.n}</p>
              <p className="font-display text-[11px] tracking-[0.1em] text-ink-soft/85">
                {p.hex}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
