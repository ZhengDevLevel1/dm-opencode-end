type AvatarProps = {
  size?: number;
  breathe?: boolean;
  className?: string;
};

/**
 * 花屿 AI 头像 — 手绘 SVG 花朵标记（矢量，可任意缩放）
 */
export function FlowerAvatar({ size = 44, breathe = false, className = "" }: AvatarProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {breathe && (
        <span
          className="a-aura absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(238,155,170,0.55) 0%, rgba(238,155,170,0.18) 45%, rgba(238,155,170,0) 72%)",
          }}
        />
      )}
      <span
        className={breathe ? "a-breathe" : ""}
        style={{ width: size, height: size, display: "inline-flex" }}
      >
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
          <defs>
            <linearGradient id="huaPetal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FBD3DA" />
              <stop offset="55%" stopColor="#EE9BAA" />
              <stop offset="100%" stopColor="#DE7F92" />
            </linearGradient>
          </defs>
          {/* 叶 */}
          <path
            d="M46 46c6.2-1.6 10.4-6.4 11.6-13.2-6.6.4-11.8 4.2-14 10.2z"
            fill="#8FA68E"
            opacity="0.85"
          />
          {/* 六瓣 */}
          <g fill="url(#huaPetal)">
            <ellipse cx="32" cy="17.5" rx="8.4" ry="12.4" />
            <ellipse cx="32" cy="17.5" rx="8.4" ry="12.4" transform="rotate(60 32 32)" />
            <ellipse cx="32" cy="17.5" rx="8.4" ry="12.4" transform="rotate(120 32 32)" />
            <ellipse cx="32" cy="17.5" rx="8.4" ry="12.4" transform="rotate(180 32 32)" />
            <ellipse cx="32" cy="17.5" rx="8.4" ry="12.4" transform="rotate(240 32 32)" />
            <ellipse cx="32" cy="17.5" rx="8.4" ry="12.4" transform="rotate(300 32 32)" />
          </g>
          <circle cx="32" cy="32" r="7.6" fill="#C96A7E" />
          <circle cx="32" cy="32" r="2.9" fill="#FBF6F2" opacity="0.9" />
        </svg>
      </span>
    </span>
  );
}


