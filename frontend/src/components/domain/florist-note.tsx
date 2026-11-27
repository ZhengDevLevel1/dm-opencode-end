import { useState } from "react";
import { Flower2, Leaf, Quote, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface FloristNoteProps {
  productName: string;
  description?: string;
  className?: string;
}

function NoteCopy({ name, text }: { name: string; text: string }) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Florist's Note</p>
      <h2 className="mt-3 font-display text-2xl leading-tight tracking-tight sm:text-3xl">
        花艺师手记
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
      <p className="mt-4 text-xs text-muted-foreground/80">—— 为「{name}」而作</p>
    </>
  );
}

export function FloristNote({ productName, description, className }: FloristNoteProps) {
  const name = productName || "这束花";
  const text =
    description?.trim() ||
    "每一枝花都经过挑选与修剪，保留自然的姿态与呼吸感。希望它抵达你手中时，仍带着花房清晨的露水与心意。";

  const [layout] = useState(() => Math.floor(Math.random() * 10));

  if (layout === 0) {
    return (
      <section className={cn("rounded-3xl border border-border/60 bg-card p-7 sm:p-10", className)}>
        <div className="max-w-2xl">
          <NoteCopy name={name} text={text} />
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Leaf className="h-3.5 w-3.5 text-flower-leaf" /> 当日新鲜花材
          </div>
        </div>
      </section>
    );
  }

  if (layout === 1) {
    return (
      <section className={cn("relative overflow-hidden rounded-3xl border border-border/60 bg-muted/30 px-6 py-10 text-center sm:px-12", className)}>
        <div className="absolute left-5 top-5 h-16 w-16 rounded-full border border-primary/20" />
        <div className="absolute bottom-5 right-5 h-24 w-24 rounded-full bg-flower-rose/10" />
        <div className="relative mx-auto max-w-2xl">
          <Sparkles className="mx-auto h-5 w-5 text-flower-rose" />
          <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-muted-foreground">A note from our florist</p>
          <h2 className="mt-3 font-display text-3xl tracking-tight">把心意，交给花来说</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">{text}</p>
          <p className="mt-5 text-xs text-muted-foreground">为「{name}」而作</p>
        </div>
      </section>
    );
  }

  if (layout === 2) {
    return (
      <section className={cn("rounded-3xl bg-primary px-7 py-10 text-primary-foreground sm:px-10", className)}>
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-primary-foreground/60">Florist's Note</p>
          <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight">花有花期，心意没有</h2>
          <p className="mt-4 text-sm leading-7 text-primary-foreground/75">{text}</p>
          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 px-3 py-1.5 text-xs text-primary-foreground/75">
            <Flower2 className="h-3.5 w-3.5" /> {name}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 3) {
    return (
      <section className={cn("relative overflow-hidden rounded-3xl border border-border/60 bg-card p-7 sm:p-10", className)}>
        <Quote className="absolute right-6 top-6 h-24 w-24 text-flower-rose/10" />
        <div className="relative max-w-2xl">
          <p className="font-display text-2xl leading-relaxed text-foreground/90">“{text}”</p>
          <p className="mt-5 text-xs uppercase tracking-[0.25em] text-muted-foreground">— Florist for {name}</p>
        </div>
      </section>
    );
  }

  if (layout === 4) {
    return (
      <section className={cn("relative min-h-[320px] overflow-hidden rounded-3xl bg-gradient-to-br from-foreground via-foreground/95 to-primary/60", className)}>
        <div className="relative flex min-h-[320px] max-w-xl flex-col justify-center p-7 text-white sm:p-10">
          <div className="w-fit rotate-[-1.5deg] rounded-xl bg-white/95 p-5 text-foreground shadow-xl sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Dear you,</p>
            <p className="mt-3 font-display text-xl leading-relaxed">{text}</p>
            <p className="mt-4 text-right text-xs text-muted-foreground">花艺师 · {name}</p>
          </div>
        </div>
      </section>
    );
  }

  if (layout === 5) {
    return (
      <section className={cn("grid gap-8 rounded-3xl border border-border/60 bg-muted/20 p-7 sm:p-10 md:grid-cols-[auto_1fr]", className)}>
        <div className="font-display text-7xl leading-none text-flower-rose/25 sm:text-8xl">01</div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">The making of</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">从一枝花开始</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
            <span className="rounded-lg bg-card px-2 py-2">选材</span>
            <span className="rounded-lg bg-card px-2 py-2">修剪</span>
            <span className="rounded-lg bg-card px-2 py-2">手作</span>
          </div>
        </div>
      </section>
    );
  }

  if (layout === 6) {
    return (
      <section className={cn("rounded-3xl border border-border/60 bg-card p-7 sm:p-10", className)}>
        <div className="max-w-2xl">
          <NoteCopy name={name} text={text} />
        </div>
      </section>
    );
  }

  if (layout === 7) {
    return (
      <section className={cn("relative overflow-hidden rounded-3xl bg-flower-rose/10 p-7 sm:p-10", className)}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-flower-rose/20" />
        <div className="relative max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-flower-rose/80">Hand tied with love</p>
          <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight">以手作，致心意</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
          <p className="mt-5 text-xs text-muted-foreground">为「{name}」特别制作</p>
        </div>
      </section>
    );
  }

  if (layout === 8) {
    return (
      <section className={cn("rounded-3xl border border-border/60 bg-card p-7 sm:p-10", className)}>
        <div className="grid gap-7 md:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Editorial / 花艺手记</p>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight">
              让花，替你说出
              <br />
              那些没说出口的话
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">{text}</p>
          </div>
          <div className="border-l border-border/60 pl-5 md:pl-7">
            <p className="text-xs leading-6 text-muted-foreground">
              作品：{name}
              <br />
              花材：当日鲜切花
              <br />
              包装：手工包装
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-flower-rose">
              <Leaf className="h-3.5 w-3.5" /> 自然姿态，独一无二
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("relative overflow-hidden rounded-3xl bg-foreground text-background", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/35 via-transparent to-flower-rose/25" />
      <div className="relative flex min-h-[300px] flex-col justify-end p-7 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">From the flower room</p>
        <h2 className="mt-3 font-display text-3xl tracking-tight text-white sm:text-4xl">一束花，一段心意</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">{text}</p>
        <p className="mt-5 text-xs text-white/55">花艺师手记 · {name}</p>
      </div>
    </section>
  );
}
