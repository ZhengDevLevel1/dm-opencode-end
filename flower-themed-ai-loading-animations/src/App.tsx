import { useEffect, useRef, useState } from "react";
import ChatStage, { type Phase } from "./components/ChatStage";
import GenTimeControl from "./components/GenTimeControl";
import SpecimenRail from "./components/SpecimenRail";
import { FlowerAvatar } from "./components/FlowerAvatar";

const SEED = "下周要去看望住院的奶奶，预算 200 左右，什么花合适？";

const REPLY =
  "看长辈，我会先避开香气太浓的花。这束以粉色康乃馨 9 枝配白百合 3 枝，尤加利叶收边——耐放，寓意也好，花期能撑到下周三。预算 200 元里我把玫瑰换成了洋桔梗，更素净些。要不要我顺手附一张代写卡片？";

type Msg = { id: number; text: string };

export default function App() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [runId, setRunId] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [shown, setShown] = useState(0);
  const [history, setHistory] = useState<Msg[]>([{ id: 1, text: SEED }]);
  const [heroOk, setHeroOk] = useState(true);
  const [genMs, setGenMs] = useState(12000);

  const t0Ref = useRef(0);
  const endRef = useRef(0);

  /* 一次等待的起点：发送 / 重播 / 换方案 */
  useEffect(() => {
    if (phase !== "waiting") return;
    const now = Date.now();
    t0Ref.current = now;
    endRef.current = now + genMs;
    setElapsed(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, runId]);

  /* 毫秒计时 + 到点切字：每 50ms 刷新，等宽数字静止更新，不做跳动动画 */
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

  /* 拖动滑块只改截止点，不打断正在跑的动画 */
  useEffect(() => {
    endRef.current = t0Ref.current + genMs;
  }, [genMs]);

  /* 逐字流出 */
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

  const restart = () => {
    setShown(0);
    setElapsed(0);
    setPhase("waiting");
    setRunId((r) => r + 1);
  };

  const onSend = (text: string) => {
    setHistory([{ id: Date.now(), text }]);
    restart();
  };

  return (
    <div className="grain relative min-h-screen overflow-x-hidden bg-paper">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-3 lg:px-10">
          <span className="flex items-center gap-2.5">
            <FlowerAvatar size={22} />
            <span className="font-display text-[12px] tracking-[0.3em] text-ink">
              花屿 HUA YU
            </span>
            <span className="hidden h-3 w-px bg-line sm:block" />
            <span className="hidden text-[12px] tracking-[0.16em] text-ink-soft sm:block">
              AI 挑花顾问
            </span>
          </span>
          <span className="font-display text-[11.5px] tracking-[0.26em] text-ink-soft">
            LOADING STATES · SPECIMEN
          </span>
        </div>
      </div>

      {/* 主视觉 */}
      <section className="relative isolate overflow-hidden border-b border-line bg-paper-deep">
        {heroOk && (
          <img
            src="images/peonies.jpg"
            alt=""
            onError={() => setHeroOk(false)}
            className="absolute inset-0 h-full w-full object-cover object-[72%_50%]"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, #FBF6F2 4%, rgba(251,246,242,0.95) 36%, rgba(251,246,242,0.55) 64%, rgba(251,246,242,0.12) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-[1240px] px-5 py-16 sm:py-24 lg:px-10 lg:py-28">
          <p className="font-display text-[12px] tracking-[0.36em] text-rose-deep">
            ONE WAY TO WAIT
          </p>
          <h1 className="mt-4 font-serif text-[clamp(36px,7vw,68px)] font-bold leading-[1.06] tracking-[-0.01em] text-ink">
            等待的呼吸
          </h1>
          <p className="mt-3 font-display text-[clamp(17px,2.4vw,26px)] italic text-rose-deep/85">
            a vine that keeps growing until the first character
          </p>
          <p className="mt-6 max-w-[44ch] text-[14.5px] leading-[1.95] font-light text-ink-soft">
            花屿挑花顾问在「消息已发出、AI 尚未吐出第一个字」这段时间的过渡方案：
            <span className="text-ink">花茎生长</span>——一茬一茬重复抽枝、结苞、倒下、重生，
            思考文案按 2.5 秒一拍循环播放。拖动滑块控制生成耗时，点「重播」随时再看一遍。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] tracking-[0.1em] text-ink-soft">
            {["不引起焦虑", "契合花语", "轻量不卡顿"].map((p, i) => (
              <span key={p} className="flex items-center gap-5">
                {i > 0 && <span className="h-3 w-px bg-line" />}
                <span className="text-rose-deep">{p}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 索引 + 会话台 */}
      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-12 px-5 py-12 lg:grid-cols-[1fr_minmax(380px,500px)] lg:gap-14 lg:px-10 lg:py-16">
        <div className="order-2 lg:order-1">
          <SpecimenRail elapsed={elapsed} running={phase === "waiting"} />
        </div>
        <div className="order-1 lg:order-2 lg:sticky lg:top-[76px] lg:h-fit lg:self-start">
          <GenTimeControl value={genMs} onChange={setGenMs} />
          <div className="mt-4">
            <ChatStage
              phase={phase}
              elapsed={elapsed}
              runId={runId}
              shown={shown}
              reply={REPLY}
              history={history}
              onSend={onSend}
              onReplay={() => restart()}
            />
          </div>
          <p className="mt-3.5 text-center text-[11.5px] font-light tracking-[0.06em] text-ink-soft/75">
            拖动上面的滑块控制生成耗时 · 「重播」随时再看一遍一茬的完整生长
          </p>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-line bg-paper-deep/60">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p className="text-[12.5px] font-light leading-relaxed text-ink-soft">
            全部动画仅用 CSS <span className="font-display">@keyframes</span> + transform/opacity，
            无动画库、无菊花转；已适配 prefers-reduced-motion。
          </p>
          <p className="font-display text-[11.5px] tracking-[0.24em] text-ink-soft">
            花屿 · FLORAL CONCIERGE
          </p>
        </div>
      </footer>
    </div>
  );
}
