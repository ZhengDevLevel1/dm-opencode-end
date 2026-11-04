import { Link } from "react-router-dom";
import { Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-dashed border-border bg-card text-primary/70">
        <Flower2 className="h-10 w-10" strokeWidth={1.4} />
      </span>
      <div className="space-y-1.5">
        <p className="font-mono-ui text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          404 · Not Found
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">这束花还没做好。</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          页面可能已经下架或地址有误。回到首页，看看今天当季的花。
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => history.back()}>
          返回上一页
        </Button>
        <Link to="/">
          <Button>回到花礼首页</Button>
        </Link>
      </div>
    </div>
  );
}
