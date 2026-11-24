import { useEffect, useState } from "react";

const COPY = [
  "正在倾听您的需求…",
  "正在查阅花材库…",
  "正在精心为您搭配花束…",
  "还在挑呢，慢一点也没关系…",
];

const COPY_EVERY = 2500;
const VINE_CYCLE = 7000;
const LEAF_PATH = "M0 0 C5 -5.5 13 -6 17 0 C13 6 5 5.5 0 0 Z";
const LEAVES = [
  { x: 13, y: 41, rotate: -28, fill: "#8FA68E", delay: "0.6s" },
  { x: 27, y: 33, rotate: 24, fill: "#A6BA9F", delay: "1.8s" },
  { x: 41, y: 21, rotate: -34, fill: "#8FA68E", delay: "3.2s" },
  { x: 55, y: 13, rotate: 18, fill: "#A6BA9F", delay: "4.6s" },
];

function copyIndexAt(elapsed: number) {
  return Math.floor(Math.max(0, elapsed) / COPY_EVERY) % COPY.length;
}

function Ticker({ elapsed }: { elapsed: number }) {
  const total = Math.max(0, elapsed) / 1000;
  const sec = Math.floor(total);
  const tenth = Math.floor((total - sec) * 10);
  return (
    <span
      className="stem-ticker"
      style={{ minWidth: "5ch" }}
      aria-label={`${total.toFixed(1)} 秒`}
    >
      {sec}.{tenth}s
    </span>
  );
}

export function StemLoader({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startedAt));
  const [cycle, setCycle] = useState(0);
  const copy = COPY[copyIndexAt(elapsed)];

  useEffect(() => {
    const timer = window.setTimeout(() => setCycle((value) => value + 1), VINE_CYCLE);
    return () => window.clearTimeout(timer);
  }, [cycle]);

  useEffect(() => {
    const tick = () => setElapsed(Math.max(0, Date.now() - startedAt));
    tick();
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex w-fit max-w-full items-center gap-4 rounded-[22px] rounded-bl-[6px] border border-border/60 bg-card px-4 py-3.5 shadow-[0_10px_28px_-24px_rgba(58,47,49,0.6)]">
      <div key={cycle} className="stem-vine h-[46px] w-[78px] shrink-0">
        <svg
          viewBox="0 0 78 46"
          width="78"
          height="46"
          className="overflow-visible"
          aria-hidden="true"
        >
          <path
            className="stem-line"
            pathLength={1}
            d="M5 43C16 41 26 35 34 26C41 18 52 11 70 7"
            fill="none"
            stroke="#8FA68E"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {LEAVES.map((leaf) => (
            <g
              key={`${leaf.x}-${leaf.y}`}
              transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.rotate})`}
            >
              <path
                className="stem-leaf"
                d={LEAF_PATH}
                fill={leaf.fill}
                style={{ animationDelay: leaf.delay }}
              />
            </g>
          ))}
          <g transform="translate(70 7)">
            <circle className="stem-bud" r="5.4" fill="#EE9BAA" />
            <circle className="stem-bud-core" r="2" fill="#C96A7E" />
          </g>
        </svg>
      </div>

      <div className="min-w-0">
        <p
          key={copy}
          className="stem-rise text-[13.5px] leading-snug font-light text-muted-foreground"
        >
          {copy}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-[0.08em] text-[#C96A7E]">
          <span className="whitespace-nowrap">第 {cycle + 1} 茬</span>
          <span className="h-3 w-px bg-border" />
          <span>思考中</span>
          <Ticker elapsed={elapsed} />
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          花屿正在思考
        </span>
      </div>
    </div>
  );
}
