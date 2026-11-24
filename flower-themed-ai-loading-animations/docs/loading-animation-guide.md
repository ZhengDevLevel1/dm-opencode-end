# 花屿 · 「花茎生长」加载动画 —— 超详细实现文档

> 用途：把本文档整篇交给另一个 AI / 工程师，即可完整复刻下面这个等待动画。
> 效果一句话：**用户发出消息后、AI 吐出第一个字之前的空窗期里，一株粉色系的藤蔓在气泡里一茬一茬地生长——抽枝、长叶、结苞呼吸、倒下枯萎、新枝淡入重生，同时思考文案每 2.5 秒循环一拍、右下角有一行一位小数的静止计时。**
>
> 技术栈：React + TypeScript + Tailwind CSS v4，**动画 100% 用 CSS `@keyframes`，不引入任何动画库**。

---

## 0. 一分钟速览（TL;DR）

| 项 | 值 |
|---|---|
| 唯一动画 | 花茎生长 `StemLoader` |
| 一茬周期 | `7000ms`（`VINE_CYCLE`），到点**整组重挂载**重播 |
| 抽枝时长 | `5.2s`，减速曲线 `cubic-bezier(.16,.72,.28,1)` |
| 出叶时刻 | `0.6s / 1.8s / 3.2s / 4.6s`（间隔逐渐拉大） |
| 结苞 | `5.1s` 出现 → `5.7s` 起无限呼吸 |
| 倒下枯萎 | 第 `6.3s → 7.0s`（90%–100% 关键帧，淡出 + 下移 + 旋转） |
| 文案循环 | 每 `2500ms` 一拍，4 拍循环（`index = floor(elapsed/2500) % 4`） |
| 计时器 | 秒 + **一位小数**（`4.3s`），等宽数字、**永不跳动** |
| 生成耗时 | 由滑块控制 `2000–24000ms`，默认 `12000ms` |
| 出字 | 逐字打字机（每 `46ms` +2 字），粉色光标 `step-end` 闪烁 |
| 硬约束 | 不用菊花转 / 不硬跳重置 / 不预设生成时长 / 适配 `prefers-reduced-motion` |

**文件结构**

```
src/
├─ index.css                 # 所有 @keyframes 与动画类（第 5 节）
├─ App.tsx                   # 状态机与计时（第 9 节）
├─ components/
│  ├─ FlowerAvatar.tsx       # SVG 花朵头像
│  ├─ loaders.tsx            # StemLoader + Ticker + 文案循环（第 4/6/7 节）
│  ├─ ChatStage.tsx          # 会话台：等待态 / 打字机 / 输入框
│  ├─ GenTimeControl.tsx     # 生成耗时滑块（第 8 节）
│  └─ SpecimenRail.tsx       # 左栏标本说明 + 文案拍子高亮
```

---

## 1. 效果定义与验收清单

### 1.1 场景
聊天界面里，用户点「发送」到 AI 出现第一个字之间，必须给出反馈。要求三条：

1. **不引起焦虑** —— 不转圈、不闪红、不报进度百分比（因为不知道真实进度）；
2. **契合品牌调性（花 / 自然）** —— 生长、呼吸、花瓣，而不是工业感的 spinner；
3. **轻量不卡顿** —— 只动 `transform` / `opacity` / `stroke-dashoffset`，全部走合成层，不触发重排。

### 1.2 验收清单（逐条可勾选）

- [ ] 发送后 **0.4s 内**藤蔓从气泡左侧开始抽枝（有淡入，不是硬出现）
- [ ] 叶片按 0.6 / 1.8 / 3.2 / 4.6 秒依次长出，**间隔越来越慢**
- [ ] 5.1 秒结出粉色花苞，之后**一直轻微呼吸**（即使等待继续也不停）
- [ ] 6.3 秒整株开始**淡出 + 下移 + 轻微旋转**，7.0 秒完全消失
- [ ] 7.0 秒**新一茬从同一位置淡入**，全程看不到闪烁 / 跳帧 / 半帧残影
- [ ] 状态行显示 `第 N 茬 · 思考中 4.3s`，N 随循环递增，秒数只增不跳
- [ ] 思考文案每 2.5 秒换一句，**四句走完回到第一句**，循环不止
- [ ] 生成耗时滑块拖动时**动画不被打断**，只改变出字时刻
- [ ] 出字后光标在句首闪烁，文字逐字流出，最后出现推荐花束卡片
- [ ] `prefers-reduced-motion: reduce` 下藤蔓静态显示、不循环、不呼吸
- [ ] 无任何菊花转 / 旋转圆环 / 无限 shimmer 骨架屏

---

## 2. 视觉规格

### 2.1 色板（务必照抄，颜色一改气质就变）

| 用途 | Hex | 说明 |
|---|---|---|
| 页面纸白 | `#FBF6F2` | 暖纸，不是纯白 |
| 卡片 | `#FFFDFB` | 气泡 / 面板 |
| 暖墨（正文） | `#3A2F31` | 绝不用纯黑 `#000` |
| 次级文字 | `#7A6A6B` | 思考文案用它，越淡越不焦虑 |
| 分隔线 | `#E7DED8` | 暖灰褐，非 `#e5e5e5` |
| 花屿粉 | `#EE9BAA` | 主强调色 |
| 深玫瑰 | `#C96A7E` | 计时数字、光标 |
| 浅霞 | `#F9E3E8` | hover、选中底色 |
| 叶绿 | `#8FA68E` | **藤蔓主色** |
| 叶绿（浅） | `#A6BA9F` | 交替叶片 |

### 2.2 字体

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@500;600;700&display=swap" rel="stylesheet" />
```

- 中文标题：`Noto Serif SC` 600/700
- 中文正文：`Noto Sans SC` 300（**轻字重是"温柔"的关键**）
- 数字 / 拉丁标签：`Instrument Serif`，大写字母 + `letter-spacing: 0.3em`
- 数字必须 `font-variant-numeric: tabular-nums`（等宽，否则秒数变化会左右抖动）

### 2.3 气泡内布局

```
┌ 气泡 (rounded-[22px] rounded-bl-[6px] border #E7DED8 bg #FFFDFB px-4 py-3.5)
│
│  [藤蔓 78×46]  ← gap-4 (16px) →  [文案行 13.5px #7A6A6B]
│                                    [第 N 茬 │ 思考中 4.3s  11px #C96A7E]
└
```

藤蔓 SVG 参数：`viewBox="0 0 78 46"` `width=78` `height=46` `className="overflow-visible"`（叶片会溢出几个像素，必须允许）。

---

## 3. 时间模型（三种独立的时间，千万别混）

这是最容易做错的地方。系统里有**三条互不相干的时间线**：

| 时间线 | 周期 | 谁驱动 | 用途 |
|---|---|---|---|
| **A. 生成耗时** | 用户可调，`2000–24000ms` | `Date.now()` 与截止时间比较 | 决定什么时候开始出字 |
| **B. 一茬生长** | 固定 `7000ms` | CSS 动画 + `setTimeout` 重挂载 | 藤蔓的生命周期 |
| **C. 文案拍子** | 固定 `2500ms` | `elapsed` 取模 | 循环切换思考文案 |

三条线**必须互相独立**：

- ❌ 错误做法：把藤蔓画完的时刻等同于"出字时刻" —— 一旦生成时长未知就会"长完了却没动静"；
- ❌ 错误做法：文案按 `elapsed` 单向推进、只走一遍 —— 等待超过 10 秒就永远停在最后一句；
- ✅ 正确做法：藤蔓按自己的 7 秒循环、文案按自己的 2.5 秒循环、出字只看截止时间，三者只共享同一个 `t0`（起始时刻）。

---

## 4. 组件一：`StemLoader`（核心）

```tsx
// src/components/loaders.tsx
import { useEffect, useState } from "react";

/* ── 4.1 动态思考文案：每 2.5s 前进一拍，走完从头再来（循环播放） ── */
export const COPY = [
  "正在倾听您的需求…",
  "正在查阅花材库…",
  "正在精心为您搭配花束…",
  "还在挑呢，慢一点也没关系…",
];
export const COPY_EVERY = 2500;

export const copyIndexAt = (elapsed: number) =>
  Math.floor(Math.max(0, elapsed) / COPY_EVERY) % COPY.length;

/* ── 4.2 计时器：秒 + 一位小数，等宽静止刷新，不做任何跳动 ── */
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

/* ── 4.3 花茎生长（唯一保留的等待方案） ── */
export function StemLoader({ elapsed }: { elapsed: number }) {
  const copy = COPY[copyIndexAt(elapsed)];
  const LEAF = "M0 0 C5 -5.5 13 -6 17 0 C13 6 5 5.5 0 0 Z";

  // 关键：每一茬走完就重挂载，整组 CSS 动画从头重播 —— 零闪烁、零逐帧计算
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setCycle((c) => c + 1), VINE_CYCLE);
    return () => window.clearTimeout(t);
  }, [cycle]);

  return (
    <div className="flex w-fit max-w-full items-center gap-4 rounded-[22px] rounded-bl-[6px] border border-line bg-card px-4 py-3.5 shadow-[0_10px_28px_-24px_rgba(58,47,49,0.6)]">
      {/* key={cycle} 变化 → React 卸载并重建这个 div → 其上所有动画从 0 重新开始 */}
      <div key={cycle} className="a-vine h-[46px] w-[78px] shrink-0">
        <svg viewBox="0 0 78 46" width="78" height="46" className="overflow-visible" aria-hidden="true">
          {/* 主茎：pathLength=1 让 dasharray 可以直接用 0~1 表示进度 */}
          <path
            className="a-stem"
            pathLength={1}
            d="M5 43C16 41 26 35 34 26C41 18 52 11 70 7"
            fill="none"
            stroke="#8FA68E"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* 叶片间隔逐渐拉大：0.6 / 1.8 / 3.2 / 4.6s */}
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
          {/* 生长点：先 scale-in，再无限呼吸 */}
          <g transform="translate(70 7)">
            <circle className="a-bud-1" r="5.4" fill="#EE9BAA" />
            <circle className="a-bud-2" r="2" fill="#C96A7E" />
          </g>
        </svg>
      </div>

      <div className="min-w-0">
        {/* key={copy}：文案变化时重建节点，让淡入动画重新播一次 */}
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
```

### 4.1 主茎几何（照抄即可）

```
viewBox : 0 0 78 46
path    : M5 43 C16 41 26 35 34 26 C41 18 52 11 70 7
起点    : (5, 43)  左下角 = 生根点（每茬都在这里，位置永远一致）
终点    : (70, 7)  右上角 = 生长点 / 花苞位置
```

贝塞尔分两段：第一段从根部爬升到画面中部 `(34,26)`，第二段加速甩向右上 `(70,7)`。**整条曲线必须在一次 `d` 属性里**，这样 `pathLength` 归一化后可以线性描线。

### 4.2 叶片几何

叶片是同一个 path，靠 `transform` 摆位：

```
LEAF = "M0 0 C5 -5.5 13 -6 17 0 C13 6 5 5.5 0 0 Z"   // 长 17px 的柳叶

# translate(x y) rotate(deg)
叶1 (13,41) -28°  #8FA68E  0.6s
叶2 (27,33) +24°  #A6BA9F  1.8s
叶3 (41,21) -34°  #8FA68E  3.2s
叶4 (55,13) +18°  #A6BA9F  4.6s
```

- 四片叶子**正负角交替**，视觉上左右互生，像真藤蔓；
- 两个绿色深浅交替，避免呆板；
- 间隔 `1.2s → 1.4s → 1.4s` 逐渐拉大，暗示"越长越慢"，**不暗示完成时刻**。

### 4.3 花苞

```
(70,7) 外圈 r=5.4  #EE9BAA   class="a-bud-1"
(70,7) 内圈 r=2.0  #C96A7E   class="a-bud-2"
```

外圈先 `scale-in`（5.1s），再呼吸；内圈延迟 0.2s 跟上，形成"心跳"层次。

### 4.4 一茬的时间轴

| 时刻 | 事件 |
|---|---|
| 0.00s | 容器 `opacity 0 → 1` 淡入 + 上移 5px（6% 关键帧） |
| 0.00–5.20s | 主茎描线（减速，越到后面越慢） |
| 0.6 / 1.8 / 3.2 / 4.6s | 四片叶子依次 scale-in |
| 5.1 / 5.3s | 花苞外圈 / 内圈出现 |
| 5.7s 起 | 花苞持续呼吸（1.9s 一拍，`scale 1 → 1.18`） |
| 6.30–7.00s | **倒下枯萎**：`opacity → 0`、`translateY +9px`、`rotate(-3deg)` |
| 7.00s | React 重挂载 → 回到 0.00s，新一茬开始 |

---

## 5. 全部 CSS（`src/index.css`）

> 顶部必须是 Tailwind v4 的 `@import "tailwindcss";`，**不要写成 v3 的 `@tailwind base/components/utilities`**。

```css
@import "tailwindcss";

@theme {
  --color-paper: #fbf6f2;
  --color-card: #fffdfb;
  --color-ink: #3a2f31;
  --color-ink-soft: #7a6a6b;
  --color-line: #e7ded8;
  --color-rose: #ee9baa;
  --color-rose-deep: #c96a7e;
  --color-blush: #fbe7ea;
  --color-sage: #8fa68e;
  --font-sans: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-serif: "Noto Serif SC", "Songti SC", serif;
  --font-display: "Instrument Serif", "Noto Serif SC", serif;
}

/* ── 5.1 主茎描线 ──────────────────────────────────────── */
@keyframes huaGrow {
  to { stroke-dashoffset: 0; }
}
.a-stem {
  stroke-dasharray: 1;      /* 配合 pathLength=1：1 = 全长 */
  stroke-dashoffset: 1;     /* 起点完全隐藏 */
  animation: huaGrow 5.2s cubic-bezier(0.16, 0.72, 0.28, 1) forwards;
  /* 减速曲线：前 1 秒就画掉一半，之后越来越慢 → 永远"还在长"的手感 */
}

/* ── 5.2 一茬的生命周期：淡入 → 生长 → 倒下 ────────────── */
@keyframes huaVineCycle {
  0%   { opacity: 0; transform: translateY(5px); }
  6%   { opacity: 1; transform: translateY(0); }   /* 0.42s 淡入 */
  90%  { opacity: 1; transform: translateY(0); }   /* 6.3s 前保持 */
  100% { opacity: 0; transform: translateY(9px) rotate(-3deg); } /* 0.7s 倒下 */
}
.a-vine {
  transform-origin: 0% 100%;   /* 以左下角为轴倒，像从根部折断 */
  animation: huaVineCycle 7s cubic-bezier(0.4, 0, 0.3, 1) forwards;
  will-change: opacity, transform;
}

/* ── 5.3 叶片 scale-in ─────────────────────────────────── */
@keyframes huaLeaf {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.a-leaf {
  transform-box: fill-box;     /* 关键：以自身包围盒为基准缩放 */
  transform-origin: 0% 50%;    /* 从叶柄处长出，不是从中心 */
  animation: huaLeaf 0.7s cubic-bezier(0.34, 1.5, 0.64, 1) both; /* 轻微回弹 */
}

/* ── 5.4 花苞：出现 + 无限呼吸 ─────────────────────────── */
.a-bud-1, .a-bud-2 {
  transform-box: fill-box;
  transform-origin: center;
}
.a-bud-1 {
  animation:
    huaLeaf 0.7s cubic-bezier(0.34, 1.5, 0.64, 1) 5.1s both,
    huaBudPulse 1.9s ease-in-out 5.7s infinite;
}
.a-bud-2 {
  animation:
    huaLeaf 0.7s cubic-bezier(0.34, 1.5, 0.64, 1) 5.3s both,
    huaBudPulse 1.9s ease-in-out 5.9s infinite;
}
@keyframes huaBudPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.18); }
}

/* ── 5.5 文案淡入 ──────────────────────────────────────── */
@keyframes huaRise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.a-rise { animation: huaRise 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both; }

/* ── 5.6 计时数字（静止等宽，绝不跳动） ────────────────── */
.ticker {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

/* ── 5.7 回复打字机的光标 ──────────────────────────────── */
@keyframes huablink {
  0%, 45%  { opacity: 1; }
  55%, 100% { opacity: 0; }
}
.a-caret { animation: huablink 1.05s step-end infinite; }

/* ── 5.8 在线小圆点 ────────────────────────────────────── */
@keyframes huaDot {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50%      { opacity: 1;   transform: scale(1); }
}
.a-dot { animation: huaDot 1.6s ease-in-out infinite; }

/* ── 5.9 纸张颗粒（可选，让背景不"数字味"） ─────────────── */
.grain::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 60;
  opacity: 0.5;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.14'/%3E%3C/svg%3E");
}

/* ── 5.10 可选：AI 头像呼吸（等待时头像本身也可以慢慢呼吸） ── */
@keyframes huabreathe {
  0%, 100% { transform: scale(0.86); opacity: 0.62; }
  50%      { transform: scale(1.06); opacity: 1; }
}
.a-breathe {
  animation: huabreathe 2.8s cubic-bezier(0.45, 0, 0.35, 1) infinite;
  transform-origin: center;
  will-change: transform, opacity;
}
@keyframes huaaura {
  0%, 100% { transform: scale(0.9);  opacity: 0.25; }
  50%      { transform: scale(1.25); opacity: 0.6; }
}
.a-aura {
  animation: huaaura 2.8s cubic-bezier(0.45, 0, 0.35, 1) infinite;
}

/* ── 5.11 无障碍 ───────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .a-breathe, .a-dot, .a-caret, .a-rise { animation: none !important; }
  .a-stem  { animation: none !important; stroke-dashoffset: 0 !important; } /* 直接画满 */
  .a-vine  { animation: none !important; opacity: 1; transform: none; }      /* 不倒不重播 */
  .a-leaf, .a-bud-1, .a-bud-2 { animation: none !important; }                /* 静态显示 */
}
```

---

## 6. 动态思考文案（循环播放）

```ts
export const COPY = [
  "正在倾听您的需求…",       // 拍 1：0.0 – 2.5s
  "正在查阅花材库…",         // 拍 2：2.5 – 5.0s
  "正在精心为您搭配花束…",   // 拍 3：5.0 – 7.5s
  "还在挑呢，慢一点也没关系…", // 拍 4：7.5 – 10.0s，然后回到拍 1
];
export const copyIndexAt = (elapsed: number) =>
  Math.floor(Math.max(0, elapsed) / 2500) % COPY.length;
```

要点：
- **取模**是"循环"的全部秘密，别写成 `if (elapsed < 2500) ... else if (elapsed < 5000) ...` 的单向链；
- 文案节点加 `key={copy}`，句子变化时 React 重建节点，`.a-rise` 淡入动画自然重播；
- 第四句是**超时兜底**：不报错、不催促，把等待说得像人话；
- 文案时长与藤蔓周期**故意不同步**（2.5s vs 7s），两条线错位推进，画面才有"活着"的错落感。

---

## 7. 计时器（一位小数、绝不跳动）

```tsx
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
```

三条铁律：
1. **等宽数字**（`tabular-nums`）+ 固定 `min-width: 5ch` → 数字变化不推动任何邻居；
2. **不做缩放/位移动画**（曾经的"每秒跳一下"是焦虑来源）；
3. 秒位实色 `#C96A7E`，小数位可用 `text-rose-deep/55` 压淡——变化的部分视觉上更安静。

---

## 8. 「控制生成耗时」组件（演示 / 调试用）

```tsx
const MIN = 2000, MAX = 24000, CYCLE = 7000;
const PRESETS = [
  { ms: 4000,  label: "4s 快答" },
  { ms: 7000,  label: "7s 正好一茬" },
  { ms: 12000, label: "12s 一茬半" },
  { ms: 20000, label: "20s 极慢" },
];
const pct = (ms: number) => ((ms - MIN) / (MAX - MIN)) * 100;

export default function GenTimeControl({ value, onChange }: {
  value: number; onChange: (ms: number) => void;
}) {
  const p = pct(value);
  return (
    <section className="rounded-[24px] border border-line bg-card px-5 py-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-[11.5px] tracking-[0.3em] text-ink-soft">SIMULATED LATENCY</p>
          <h3 className="mt-1 font-serif text-[15px] font-semibold">控制生成耗时</h3>
        </div>
        <div className="text-right leading-none">
          <span className="font-display text-[38px] text-rose-deep tabular">
            {(value / 1000).toFixed(2)}
          </span>
          <span className="ml-1 font-display text-[15px] text-rose-deep/70">s</span>
          <p className="mt-1.5 text-[11px] text-ink-soft">约 {(value / CYCLE).toFixed(1)} 茬藤蔓 · 7s 一茬</p>
        </div>
      </div>

      <div className="relative mt-5">
        <input
          type="range" min={MIN} max={MAX} step={100} value={value}
          aria-label="模拟生成耗时（毫秒）"
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-[6px] w-full cursor-pointer appearance-none rounded-full outline-none
                     [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px]
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-rose-deep
                     [&::-webkit-slider-thumb]:shadow-[0_0_0_5px_rgba(251,231,234,0.95)]"
          style={{ background: `linear-gradient(to right,#EE9BAA 0%,#EE9BAA ${p}%,#E7DED8 ${p}%,#E7DED8 100%)` }}
        />
        {/* 轨道刻度：第 2、3 茬的位置 */}
        <div className="pointer-events-none absolute inset-x-0 top-[10px] h-4">
          {[2, 3].map((n) => {
            const at = pct(n * CYCLE);
            return at > 99 ? null : (
              <span key={n} className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${at}%` }}>
                <span className="h-[7px] w-px bg-line" />
                <span className="mt-1 font-display text-[10px] text-ink-soft/85">{n}茬</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {PRESETS.map((pr) => (
          <button key={pr.ms} type="button" onClick={() => onChange(pr.ms)}
            className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
              value === pr.ms
                ? "border-rose-deep bg-rose-deep text-paper"
                : "border-line bg-paper text-ink-soft hover:border-rose hover:bg-blush"
            }`}>
            {pr.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-ink-soft">改时长只改截止点，动画不重来</span>
      </div>
    </section>
  );
}
```

---

## 9. 父组件状态机（`App.tsx`）

### 9.1 状态

```tsx
type Phase = "waiting" | "streaming" | "done";

const [phase, setPhase]     = useState<Phase>("waiting");
const [runId, setRunId]     = useState(0);   // 发送/重播一次 +1，用于强制重挂载
const [elapsed, setElapsed] = useState(0);   // 毫秒
const [shown, setShown]     = useState(0);   // 已流出的字符数
const [genMs, setGenMs]     = useState(12000);
const [history, setHistory] = useState<Msg[]>([{ id: 1, text: SEED }]);

const t0Ref = useRef(0);   // 本次等待的起始时刻
const endRef = useRef(0);  // 出字截止时刻
```

### 9.2 三个 effect（**这是最容易写错的部分**）

```tsx
// ① 起点：发送 / 重播 / 换轮次时重置。genMs 故意不进依赖，否则拖滑块会重来
useEffect(() => {
  if (phase !== "waiting") return;
  const now = Date.now();
  t0Ref.current = now;
  endRef.current = now + genMs;
  setElapsed(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [phase, runId]);

// ② 每 50ms 刷新计时，到点切到 streaming。只依赖 phase，靠 ref 读最新值
useEffect(() => {
  if (phase !== "waiting") return;
  const iv = window.setInterval(() => {
    const now = Date.now();
    setElapsed(now - t0Ref.current);
    if (now >= endRef.current) {
      setShown(0);
      setPhase("streaming");
    }
  }, 50);
  return () => window.clearInterval(iv);
}, [phase]);

// ③ 拖滑块：只改截止点，不打断正在跑的动画
useEffect(() => {
  endRef.current = t0Ref.current + genMs;
}, [genMs]);
```

**为什么用 `ref` + 单一 interval，而不是 `setTimeout(genMs)`？**
因为拖动滑块时若重新 `setTimeout`，必须重置 `t0`，会把已经跑了 6 秒的动画打回 0 秒。用 `endRef` 只改终点，藤蔓继续长，计时继续走。

### 9.3 出字（打字机）

```tsx
useEffect(() => {
  if (phase !== "streaming") return;
  const iv = window.setInterval(
    () => setShown((s) => Math.min(REPLY.length, s + 2)),
    46,
  );
  return () => window.clearInterval(iv);
}, [phase]);

useEffect(() => {
  if (phase === "streaming" && shown >= REPLY.length) setPhase("done");
}, [phase, shown]);
```

```tsx
// 会话流里的 AI 行
{phase === "waiting" && (
  <Fragment key={runId}>          {/* ← 换轮次时整块重挂载，单次时间线重新开始 */}
    <StemLoader elapsed={elapsed} />
  </Fragment>
)}

{phase !== "waiting" && (
  <div className="a-rise rounded-[20px] rounded-tl-[6px] border border-line bg-card px-4 py-3">
    <p className="text-[14px] leading-[1.85] text-ink">
      {reply.slice(0, shown)}
      {phase === "streaming" && (
        <span className="a-caret ml-0.5 inline-block h-[15px] w-[2px] translate-y-[3px]
                         rounded-full bg-rose-deep align-middle" />
      )}
    </p>
  </div>
)}
```

### 9.4 触发函数

```tsx
const restart = () => {
  setShown(0);
  setElapsed(0);
  setPhase("waiting");
  setRunId((r) => r + 1);   // 关键：即使 phase 本来就是 waiting，也靠 runId 让 effect ① 重跑
};

const onSend = (text: string) => {
  setHistory([{ id: Date.now(), text }]);
  restart();
};
```

---

## 10. 性能与无障碍

**性能**
- 只动 `transform` / `opacity` / `stroke-dashoffset`，不碰 `width/left/top`（不触发 layout）；
- 给循环或持续动画加 `will-change: transform, opacity`，但**不要给整个页面加**；
- 一茬重播用 **React 重挂载**（改 `key`），而不是用 JS 去逐个读写 `element.style`——前者由浏览器一次 diff，后者每 7 秒 60 帧的手工操作，还容易和 CSS 时间轴错位；
- 一茬只重挂载 ~10 个 SVG 节点，7 秒一次，开销可忽略；
- 页面整体颗粒感用静态 SVG noise（`mix-blend-mode: multiply`），不要用动图。

**无障碍**
- 藤蔓 `<svg aria-hidden="true">`，装饰性内容不进读屏；
- 等待状态给一个 `role="status"` / `aria-live="polite"` 的隐藏文本，例如「花屿正在思考」；
- 计时数字加 `aria-label={`${(elapsed/1000).toFixed(1)} 秒`}`，否则读屏会逐位念；
- `prefers-reduced-motion` 下给出静态但完整的画面（见 5.10），而不是把内容一并隐藏；
- 滑块必须有 `aria-label`，预设按钮要有 focus 可见环（`focus-visible:ring-2`）。

---

## 11. 十个易错点（务必转告下一个实现者）

1. **不要用旋转 spinner / 菊花转** —— 工业感、催促感，与温馨挑花场景冲突。
2. **不要硬跳回起点** —— 循环必须经过"淡出 → 淡入"（或交叉溶解），否则看起来像卡了一下。
3. **不要预设生成时长** —— 动画表达"还在进行"，绝不能表达"还剩多少"；进度条/百分比一律禁止。
4. **SVG 里 `scale` 必须配 `transform-box: fill-box`** —— 否则缩放以 viewBox 原点为基准，叶片会飞到画面外。
5. **描线用 `pathLength="1"`** —— 于是 `stroke-dasharray:1 / dashoffset:1→0` 就是 0%→100%，不用去算路径真实长度。
6. **`animation-delay` 只在第一次迭代生效** —— 所以靠 delay 错峰的多元素动画**不能直接加 `infinite`**；本方案用"重挂载"绕开这个问题。
7. **计时与动画必须共享同一个 `t0`** —— 否则会出现"藤蔓长完了但还有 2 秒才出字"的空窗。
8. **`key` 技巧**：`<Fragment key={runId}>` 让单次时间线（骨架/花瓣/生长）在重播时重开；`key={cycle}` 让循环重开；`key={copy}` 让文案淡入重开。
9. **等宽数字 + 固定 min-width** —— 否则 `9s → 10s` 会把整行推移 1 像素，看起来在抖。
10. **文案循环一定要取模** —— 单向 `if/else` 链在长等待时会卡死在最后一句，用户会以为程序挂了。

---

## 12. 可直接投喂其他 AI 的提示词

```text
请为一个 React + TypeScript + Tailwind CSS v4 项目实现聊天界面的「等待首字」加载动画，
品牌是鲜花顾问「花屿」，风格清新温馨、暖纸底 + 粉色点缀。

【唯一动画：花茎生长】
- 在 AI 回复气泡位置，渲染一个 78×46 的 SVG：一条藤蔓从左下角 (5,43) 描线到右上角 (70,7)，
  路径 d="M5 43C16 41 26 35 34 26C41 18 52 11 70 7"，stroke #8FA68E，1.6px。
- 用 pathLength="1" + stroke-dasharray:1 + dashoffset 1→0 实现描线，
  时长 5.2s，缓动 cubic-bezier(.16,.72,.28,1)（减速）。
- 四片叶子用同一 path "M0 0 C5 -5.5 13 -6 17 0 C13 6 5 5.5 0 0 Z"，
  分别 translate(13 41) rotate(-28)、translate(27 33) rotate(24)、
  translate(41 21) rotate(-34)、translate(55 13) rotate(18)，
  动画延迟 0.6 / 1.8 / 3.2 / 4.6s，scale 0→1（transform-box: fill-box,
  transform-origin: 0% 50%），颜色 #8FA68E / #A6BA9F 交替。
- 5.1s 在 (70,7) 出现粉色花苞（r=5.4 #EE9BAA + r=2 #C96A7E），
  5.7s 起以 1.9s 周期无限呼吸 scale 1→1.18。
- 整株生命周期 7s：0–0.42s 淡入上移，6.3–7.0s 淡出 + translateY(9px) + rotate(-3deg) 倒下，
  7.0s 通过 React key 重挂载，让所有动画从头重播（必须无闪烁）。
- 气泡下方状态行：第 N 茬 · 思考中 4.3s。

【思考文案：循环播放】
- 四句："正在倾听您的需求…" / "正在查阅花材库…" / "正在精心为您搭配花束…" /
  "还在挑呢，慢一点也没关系…"，每 2500ms 前进一拍，
  index = Math.floor(elapsed/2500) % 4，走完回到第一句；句子变化时用 key 触发淡入。

【计时器】
- 显示秒 + 一位小数（如 4.3s），等宽数字（tabular-nums）+ 固定 min-width，
  只更新文本，绝不做缩放/跳动动画。

【生成时长控制】
- 一个 2000–24000ms 的 range 滑块 + 4 个预设（4s/7s/12s/20s），默认 12000ms；
- 拖动只改变"出字截止时刻"（用 ref 保存 t0 与 end，每 50ms 比较），
  不得重置动画、不得让计时归零。

【出字】
- 等待结束后逐字流出回复（每 46ms +2 字），句首一个 #C96A7E 光标以
  1.05s step-end 无限闪烁，完成后出现推荐花束卡片。

【硬性要求】
- 动画只用 CSS @keyframes，只动 transform/opacity/stroke-dashoffset，不引入动画库；
- 禁止旋转 spinner、禁止进度百分比、禁止循环重置时的硬跳；
- 支持 prefers-reduced-motion（藤蔓静态显示，不循环、不倒下）；
- 颜色：纸白 #FBF6F2、卡片 #FFFDFB、暖墨 #3A2F31、次级 #7A6A6B、
  线条 #E7DED8、花屿粉 #EE9BAA、深玫瑰 #C96A7E、叶绿 #8FA68E / #A6BA9F。
```

---

## 13. 最终验收（交付前逐条测）

1. 打开页面 → 600ms 内看到第一片叶子在 0.6s 抽出；
2. 让生成耗时 = `20000ms`（滑块拉到 20s）→ 观察至少 2 轮「生长→倒下→重生」，状态行依次变成 `第 2 茬`、`第 3 茬`；
3. 全程盯着生根点 → **位置不能有任何位移**（只有倒下那 0.7 秒是刻意的位移）；
4. 看计时数字 → 每 100ms 变化一次但**整行不抖动**；
5. 看文案 → 10 秒后回到第一句，循环不止；
6. 把生成耗时调到 `4000ms` → 藤蔓只长一半就出字，**不出现"长完了在干等"**；
7. 系统开启"减弱动态效果" → 藤蔓完整静态显示，没有循环、没有闪烁；
8. Performance 面板 → 无 Layout / Paint 长条，动画期间帧率稳定 60fps。
