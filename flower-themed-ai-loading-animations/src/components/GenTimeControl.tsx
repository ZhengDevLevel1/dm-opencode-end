const MIN = 2000;
const MAX = 24000;
const CYCLE = 7000; // 藤蔓一茬的周期，用来在轨道上打刻度

const PRESETS = [
  { ms: 4000, label: "4s 快答" },
  { ms: 7000, label: "7s 正好一茬" },
  { ms: 12000, label: "12s 一茬半" },
  { ms: 20000, label: "20s 极慢" },
];

const pct = (ms: number) => ((ms - MIN) / (MAX - MIN)) * 100;

export default function GenTimeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (ms: number) => void;
}) {
  const p = pct(value);
  const cycles = (value / CYCLE).toFixed(1);

  return (
    <section className="rounded-[24px] border border-line bg-card px-5 py-5 shadow-[0_24px_60px_-52px_rgba(58,47,49,0.6)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-[11.5px] tracking-[0.3em] text-ink-soft">
            SIMULATED LATENCY
          </p>
          <h3 className="mt-1 font-serif text-[15px] font-semibold">控制生成耗时</h3>
        </div>
        <div className="text-right leading-none">
          <span className="font-display text-[38px] leading-none text-rose-deep tabular">
            {(value / 1000).toFixed(2)}
          </span>
          <span className="ml-1 font-display text-[15px] text-rose-deep/70">s</span>
          <p className="mt-1.5 text-[11px] font-light text-ink-soft">
            约 {cycles} 茬藤蔓 · 7s 一茬
          </p>
        </div>
      </div>

      {/* 滑块 */}
      <div className="relative mt-5">
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={100}
          value={value}
          aria-label="模拟生成耗时（毫秒）"
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 h-[6px] w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-rose/70 [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-rose-deep [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-deep [&::-webkit-slider-thumb]:shadow-[0_0_0_5px_rgba(251,231,234,0.95)]"
          style={{
            background: `linear-gradient(to right, #EE9BAA 0%, #EE9BAA ${p}%, #E7DED8 ${p}%, #E7DED8 100%)`,
          }}
        />
        {/* 一茬 / 两茬刻度 */}
        <div className="pointer-events-none absolute inset-x-0 top-[10px] h-4">
          {[2, 3].map((n) => {
            const at = pct(n * CYCLE);
            if (at > 99) return null;
            return (
              <span
                key={n}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${at}%` }}
              >
                <span className="h-[7px] w-px bg-line" />
                <span className="mt-1 font-display text-[10px] tracking-[0.08em] text-ink-soft/85">
                  {n}茬
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 预设 */}
      <div className="mt-7 flex flex-wrap gap-2">
        {PRESETS.map((pr) => {
          const on = value === pr.ms;
          return (
            <button
              key={pr.ms}
              type="button"
              onClick={() => onChange(pr.ms)}
              className={`rounded-full border px-3 py-1.5 text-[12px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose/70 ${
                on
                  ? "border-rose-deep bg-rose-deep text-paper"
                  : "border-line bg-paper text-ink-soft hover:border-rose hover:bg-blush hover:text-rose-deep"
              }`}
            >
              {pr.label}
            </button>
          );
        })}
        <span className="ml-auto self-center text-[11px] font-light text-ink-soft">
          改时长只改截止点，动画不重来
        </span>
      </div>
    </section>
  );
}
