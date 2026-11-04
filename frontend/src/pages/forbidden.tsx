import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10 text-warning">
        <ShieldAlert className="h-8 w-8" strokeWidth={1.6} />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">这里需要更高的权限。</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          当前账号没有访问该页面的权限。如需处理履约或经营数据，请联系店长开通对应角色。
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
