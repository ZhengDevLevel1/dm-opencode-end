import { useEffect, useState } from "react";
import { Mail, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const GREETING_QUOTES = [
  "愿你被这束花温柔以待，日日都有好心情。",
  "把春天装进花里，也把祝福送给你。",
  "愿所有美好，都像花期一样如期而至。",
  "生活明朗，万物可爱，你也是。",
  "愿花香替我说一句：今天也要开心呀。",
  "祝你眼里有光，心里有花，脚下有远方。",
  "愿你收到的每一朵花，都藏着我的想念。",
  "慢慢来，花会开，好事也会来。",
  "愿你的日子像花一样，热烈又明亮。",
  "把温柔和浪漫，一起打包送给你。",
  "愿你所遇皆温柔，所行皆坦途。",
  "今天的花很好看，收到花的你更好看。",
  "愿你岁岁常欢愉，万事皆胜意。",
  "花开有时，思念无声，愿你一切都好。",
  "愿这束花，替我拥抱你一下。",
  "生活有点苦，给你加点花香和甜。",
  "愿你被爱包围，被好运偏爱。",
  "花会沿路盛开，你以后的路也是。",
  "愿每一次奔赴，都有花香相迎。",
  "祝你今天、明天、每一天都值得纪念。",
  "愿你在平凡的日子里，也能收到浪漫。",
  "把最柔软的心意，交给最懂的你。",
  "愿花常开，人常伴，喜乐常在。",
  "见到花的时候，记得也见到我的祝福。",
  "愿你不慌不忙，心之所向，皆有回响。",
  "这一束是喜欢，下一束是偏爱。",
  "愿日子清透，世事温柔，花香满袖。",
  "你值得世间所有的温柔与浪漫。",
  "愿所有期待，都开花结果。",
  "花是无声的诗，你是诗里最好的一句。",
];

function pickQuotes(count = 3): string[] {
  const pool = [...GREETING_QUOTES];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, count);
}

interface GreetingCardEditorProps {
  value: string;
  onChange: (value: string) => void;
  defaultEnabled?: boolean;
  className?: string;
  compact?: boolean;
  maxLength?: number;
  variant?: "default" | "editorial";
}

export function GreetingCardEditor({
  value,
  onChange,
  defaultEnabled = true,
  className,
  compact = false,
  maxLength = 100,
  variant = "default",
}: GreetingCardEditorProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [quotes, setQuotes] = useState(() => pickQuotes());

  useEffect(() => {
    if (value.trim()) setEnabled(true);
  }, [value]);

  useEffect(() => {
    if (value.length > maxLength) onChange(value.slice(0, maxLength));
  }, [maxLength, onChange, value]);

  const handleEnabled = (next: boolean) => {
    setEnabled(next);
    if (!next) onChange("");
  };

  if (variant === "editorial") {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card p-4 sm:p-5", className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flower-rose/10 text-flower-rose">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <Label htmlFor="greeting-card" className="text-[15px] font-medium">
                  免费手写贺卡
                </Label>
                <Switch
                  id="greeting-card-toggle"
                  checked={enabled}
                  onCheckedChange={handleEnabled}
                  label="免费手写贺卡"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                写下想说的话，由花艺师用钢笔誊抄在随花贺卡上
              </p>
            </div>
          </div>
          <span className="font-display text-[11px] tracking-widest text-muted-foreground tabular">
            {value.length}/{maxLength}
          </span>
        </div>

        {enabled ? (
          <div className="mt-4 space-y-3">
            <Textarea
              id="greeting-card"
              value={value}
              maxLength={maxLength}
              rows={4}
              placeholder="写一句想对 TA 说的话，花艺师会替你手写…"
              className="min-h-[112px] resize-none border-border/60 bg-muted/20 px-4 py-3 font-display text-[13px] leading-7 shadow-none placeholder:text-muted-foreground/60 focus-visible:border-primary/45 focus-visible:ring-primary/15"
              onChange={(event) => onChange(event.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">不知道写什么？试试这些句子</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setQuotes(pickQuotes())}
              >
                <RefreshCw className="h-3 w-3" />
                换一换
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quotes.map((quote) => (
                <button
                  key={quote}
                  type="button"
                  onClick={() => onChange(quote)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    value === quote
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                  )}
                >
                  {quote}
                </button>
              ))}
            </div>
            <p className="text-[10px] leading-4 text-muted-foreground/80">
              贺卡内容会随订单一起提交给花店，如需修改可在结算前返回此页调整。
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-muted-foreground">
            本次不需要贺卡，花束仍会按所选规格包装。
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flower-rose/10 text-flower-rose">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <Label htmlFor="greeting-card">免费手写贺卡</Label>
            <p className="text-[11px] text-muted-foreground">
              写下想说的话，我们会替您手写在随花贺卡上
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{enabled ? "已开启" : "不需要"}</span>
          <Switch
            id="greeting-card-toggle"
            checked={enabled}
            onCheckedChange={handleEnabled}
            label="免费手写贺卡"
          />
        </div>
      </div>

      {enabled ? (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">不知道写什么？试试这些</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setQuotes(pickQuotes())}
            >
              <RefreshCw className="h-3 w-3" />
              换一换
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {quotes.map((quote) => (
              <button
                key={quote}
                type="button"
                onClick={() => onChange(quote)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-xs leading-relaxed transition-colors",
                  value === quote
                    ? "border-primary/45 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground",
                )}
              >
                {quote}
              </button>
            ))}
          </div>
          <Textarea
            id="greeting-card"
            value={value}
            maxLength={maxLength}
            rows={compact ? 2 : 3}
            placeholder="也可以自己写一句祝福语"
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>贺卡内容会随订单一起提交给花店</span>
            <span className="tabular">{value.length}/{maxLength}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
