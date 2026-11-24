import { Fragment, useState } from "react";
import type { FormEvent } from "react";
import { FlowerAvatar } from "./FlowerAvatar";
import { StemLoader } from "./loaders";

export type Phase = "waiting" | "streaming" | "done";

type Props = {
  phase: Phase;
  elapsed: number;
  runId: number;
  shown: number;
  reply: string;
  history: { id: number; text: string }[];
  onSend: (text: string) => void;
  onReplay: () => void;
};

/* 等待时长由「控制生成耗时」滑块决定，见 GenTimeControl */

const ITEMS = ["粉色康乃馨", "白百合", "尤加利叶", "洋桔梗"];
const QTY = ["9 枝", "3 枝", "5 枝", "2 枝"];

export default function ChatStage({
  phase,
  elapsed,
  runId,
  shown,
  reply,
  history,
  onSend,
  onReplay,
}: Props) {
  const [draft, setDraft] = useState("");
  const [imgOk, setImgOk] = useState(true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft("");
  };



  const busy = phase !== "done";

  return (
    <div className="overflow-hidden rounded-[30px] border border-line bg-card shadow-[0_40px_80px_-56px_rgba(58,47,49,0.55)]">
      {/* 会话头 */}
      <header className="flex items-center gap-3 border-b border-line bg-[#FFFDFB] px-5 py-4">
        <FlowerAvatar size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="font-serif text-[15px] font-semibold">花屿</h2>
            <span className="font-display text-[11px] tracking-[0.18em] text-ink-soft/70">
              HUA YU
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-light text-ink-soft">
            <span className="a-dot inline-block h-[6px] w-[6px] rounded-full bg-sage" />
            挑花顾问 · 在线
          </p>
        </div>
        <button
          type="button"
          onClick={onReplay}
          className="group flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[12px] text-ink-soft transition hover:border-rose hover:bg-blush hover:text-rose-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-rose/60"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M20 11a8 8 0 1 0-2.3 6.3" />
            <path d="M20 4v7h-7" />
          </svg>
          重播
        </button>
      </header>

      {/* 会话流 */}
      <div className="space-y-4 bg-[#FFFCFA] px-5 py-5">
        {history.map((m) => (
          <div key={m.id} className="a-rise flex justify-end">
            <p className="max-w-[82%] rounded-[20px] rounded-br-[6px] bg-blush px-4 py-2.5 text-[14px] leading-relaxed font-normal text-ink">
              {m.text}
            </p>
          </div>
        ))}

        {/* AI 行 */}
        <div className="a-rise flex items-start gap-3">
          <FlowerAvatar size={34} className="mt-0.5" />
          <div className="min-w-0 space-y-3">
            {phase === "waiting" && (
              <Fragment key={runId}>
                <StemLoader elapsed={elapsed} />
              </Fragment>
            )}

            {phase !== "waiting" && (
              <div className="a-rise rounded-[20px] rounded-tl-[6px] border border-line bg-card px-4 py-3">
                <p className="text-[14px] leading-[1.85] text-ink">
                  {reply.slice(0, shown)}
                  {phase === "streaming" && (
                    <span className="a-caret ml-0.5 inline-block h-[15px] w-[2px] translate-y-[3px] rounded-full bg-rose-deep align-middle" />
                  )}
                </p>
              </div>
            )}

            {phase === "done" && (
              <div className="a-rise w-[272px] max-w-full overflow-hidden rounded-[20px] border border-line bg-card">
                <div className="relative h-[128px] bg-blush-2">
                  {imgOk && (
                    <img
                      src="images/bouquet.jpg"
                      alt="探望静养花束：粉色康乃馨配白百合与尤加利叶"
                      onError={() => setImgOk(false)}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[10.5px] tracking-[0.14em] text-rose-deep">
                    为你挑选
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-serif text-[15px] font-semibold">探望 · 静养束</h3>
                    <span className="font-display text-[21px] leading-none text-rose-deep">
                      ¥198
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5 border-t border-dashed border-line pt-3">
                    {ITEMS.map((it, i) => (
                      <li
                        key={it}
                        className="flex items-baseline justify-between text-[12.5px] font-light text-ink-soft"
                      >
                        <span>{it}</span>
                        <span className="tabular text-ink">{QTY[i]}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["花期约 7 天", "无浓香", "可代写卡片"].map((c) => (
                      <span
                        key={c}
                        className="rounded-full bg-paper px-2.5 py-1 text-[10.5px] text-ink-soft"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 输入 */}
      <form
        onSubmit={submit}
        className="flex items-center gap-3 border-t border-line bg-card px-4 py-3.5"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="说说你的场合、预算和收花的人…"
          aria-label="给花屿发送消息"
          className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[14px] font-light text-ink outline-none placeholder:text-ink-soft/55 focus:placeholder:text-ink-soft/40"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-[13px] tracking-[0.06em] text-paper transition hover:bg-rose-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-rose/60 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy ? "生成中" : "发送"}
        </button>
      </form>
    </div>
  );
}
