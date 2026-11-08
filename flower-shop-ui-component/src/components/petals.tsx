"use client";

import type { CSSProperties } from "react";

type PetalSpec = {
  left: number;
  size: number;
  duration: number;
  delay: number;
  sway: number;
  opacity: number;
  drift: number;
  spin: number;
  color: string;
};

const PALETTE = [
  "var(--flower-rose)",
  "var(--flower-leaf)",
  "var(--flower-sun)",
  "var(--primary)",
];

const PETALS: PetalSpec[] = [
  { left: 4, size: 14, duration: 17, delay: -2, sway: 3.2, opacity: 0.55, drift: 8, spin: 320, color: PALETTE[0] },
  { left: 11, size: 10, duration: 21, delay: -11, sway: 2.6, opacity: 0.4, drift: -6, spin: -260, color: PALETTE[1] },
  { left: 18, size: 16, duration: 15, delay: -7, sway: 3.6, opacity: 0.5, drift: 10, spin: 300, color: PALETTE[2] },
  { left: 27, size: 11, duration: 23, delay: -15, sway: 2.9, opacity: 0.35, drift: 5, spin: -340, color: PALETTE[0] },
  { left: 35, size: 15, duration: 18, delay: -4, sway: 3.1, opacity: 0.5, drift: -9, spin: 280, color: PALETTE[3] },
  { left: 44, size: 9, duration: 25, delay: -19, sway: 2.4, opacity: 0.38, drift: 7, spin: -300, color: PALETTE[1] },
  { left: 52, size: 13, duration: 19, delay: -9, sway: 3.4, opacity: 0.5, drift: -7, spin: 340, color: PALETTE[2] },
  { left: 61, size: 17, duration: 16, delay: -13, sway: 3.8, opacity: 0.45, drift: 9, spin: -280, color: PALETTE[0] },
  { left: 69, size: 10, duration: 22, delay: -5, sway: 2.7, opacity: 0.4, drift: -5, spin: 260, color: PALETTE[1] },
  { left: 77, size: 14, duration: 18, delay: -16, sway: 3.3, opacity: 0.52, drift: 8, spin: 320, color: PALETTE[3] },
  { left: 85, size: 11, duration: 24, delay: -8, sway: 2.8, opacity: 0.36, drift: -8, spin: -320, color: PALETTE[2] },
  { left: 93, size: 15, duration: 17, delay: -12, sway: 3.5, opacity: 0.48, drift: 6, spin: 300, color: PALETTE[0] },
];

function PetalShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 20 28" aria-hidden>
      <path
        d="M10 1 C16.5 6.5 18.5 13 10 27 C1.5 13 3.5 6.5 10 1 Z"
        fill={color}
      />
    </svg>
  );
}

export default function Petals({ count = 12 }: { count?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {PETALS.slice(0, count).map((p, i) => {
        const style = {
          left: `${p.left}%`,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
          ["--petal-opacity" as string]: p.opacity,
          ["--petal-drift" as string]: `${p.drift}vw`,
          ["--petal-spin" as string]: `${p.spin}deg`,
        } as CSSProperties;
        return (
          <span key={i} className="petal-fall absolute -top-[8vh] block" style={style}>
            <span
              className="petal-sway block"
              style={{ animationDuration: `${p.sway}s` }}
            >
              <PetalShape size={p.size} color={p.color} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
