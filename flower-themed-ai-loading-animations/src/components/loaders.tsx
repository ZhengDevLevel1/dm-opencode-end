import { useEffect, useState } from "react";

/* ── 动态思考文案：每 2.5s 前进一拍，走完从头再来（循环播放） ── */
export const COPY = [
  "正在倾听您的需求…",
  "正在查阅花材库…",
  "正在精心为您搭配花束…",
  "还在挑呢，慢一点也没关系…",
];
export const COPY_EVERY = 2500;

export const copyIndexAt = (elapsed: number) =>
  Math.floor(Math.max(0, elapsed) / COPY_EVERY) % COPY.length;

/* ── 计时器：秒 + 一位小数，等宽静止刷新，不做跳动 ───────── */
export function Ticker({ elapsed }: { elapsed: number }) {
  const total = Math.max(0, elapsed) / 1000;
  const sec = Math.floor(total);
  const tenth = Math.floor((total - sec) * 10);
  return (
    <span className="ticker" style={{ minWidth: "5ch" }}>
      {sec}.{tenth}s
    </span>
  );
}

/** 一茬藤蔓的完整周期：抽枝 5.2s → 呼吸 → 0.7s 落下 */
const VINE_CYCLE = 7000;

/* ── 花茎生长（唯一保留的等待方案） ───────────────────── */
export function StemLoader({ elapsed }: { elapsed: number }) {
  const copy = COPY[copyIndexAt(elapsed)];
  const LEAF = "M0 0 C5 -5.5 13 -6 17 0 C13 6 5 5.5 0 0 Z";
  // 每一茬走完就重挂载：整组 CSS 动画从头重播，零闪烁、零逐帧计算
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setCycle((c) => c + 1), VINE_CYCLE);
    return () => window.clearTimeout(t);
  }, [cycle]);

  return (
    <div className="flex w-fit max-w-full items-center gap-4 rounded-[22px] rounded-bl-[6px] border border-line bg-card px-4 py-3.5 shadow-[0_10px_28px_-24px_rgba(58,47,49,0.6)]">
      <div key={cycle} className="a-vine h-[46px] w-[78px] shrink-0">
        <svg
          viewBox="0 0 78 46"
          width="78"
          height="46"
          className="overflow-visible"
          aria-hidden="true"
        >
          <path
            className="a-stem"
            pathLength={1}
            d="M5 43C16 41 26 35 34 26C41 18 52 11 70 7"
            fill="none"
            stroke="#8FA68E"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* 叶片间隔逐渐拉大（0.6 / 1.8 / 3.2 / 4.6s）：一茬之内越长越慢 */}
          <g transform="translate(13 41) rotate(-28)">
            <path className="a-leaf" d={LEAF} fill="#8FA68E" style={{ animationDelay: "0.6s" }} />
          </g>
          <g transform="translate(27 33) rotate(24)">
            <path className="a-leaf" d={LEAF} fill="#A6BA9F" style={{ animationDelay: "1.8s" }} />
          </g>
          <g transform="translate(41 21) rotate(-34)">
            <path className="a-leaf" d={LEAF} fill="#8FA68E" style={{ animationDelay: "3.2s" }} />
          </g>
          <g transform="translate(55 13) rotate(18)">
            <path className="a-leaf" d={LEAF} fill="#A6BA9F" style={{ animationDelay: "4.6s" }} />
          </g>
          {/* 生长点：结苞后持续轻微呼吸，等待多久都像"还在长" */}
          <g transform="translate(70 7)">
            <circle className="a-bud-1" r="5.4" fill="#EE9BAA" />
            <circle className="a-bud-2" r="2" fill="#C96A7E" />
          </g>
        </svg>
      </div>
      <div className="min-w-0">
        <p key={copy} className="a-rise text-[13.5px] leading-snug font-light text-ink-soft">
          {copy}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-[0.08em] text-rose-deep">
          <span className="whitespace-nowrap">第 {cycle + 1} 茬</span>
          <span className="h-3 w-px bg-line" />
          <span>思考中</span>
          <Ticker elapsed={elapsed} />
        </div>
      </div>
    </div>
  );
}
