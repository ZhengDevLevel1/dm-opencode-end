import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { FulfillmentNode, FulfillmentVO } from "@/types/api";
import { fulfillmentNodeLabel } from "./status-badge";

const NODES: FulfillmentNode[] = ["ACCEPTED", "PREPARING", "DELIVERING", "SIGNED"];

export function FulfillmentTimeline({ records }: { records: FulfillmentVO[] }) {
  const latestNode = records.length > 0 ? records[records.length - 1].node : null;
  const latestIndex = latestNode ? NODES.indexOf(latestNode) : -1;

  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center">
        <p className="text-sm font-medium">等待店员接单</p>
        <p className="mt-1 text-xs text-muted-foreground">
          接单后会显示备花、配送与签收记录。
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {NODES.map((node, index) => {
        const record = records.find((item) => item.node === node);
        const done = Boolean(record);
        const current = done && index === latestIndex;
        const future = !done;
        return (
          <li key={node} className="relative flex gap-3 pb-5 last:pb-0">
            {index < NODES.length - 1 ? (
              <span
                className={cn(
                  "absolute top-3 left-[5px] h-full w-px",
                  done && index < latestIndex ? "bg-primary/50" : "bg-border",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4",
                done
                  ? current
                    ? "bg-primary ring-primary/15"
                    : "bg-primary/70 ring-transparent"
                  : "bg-border ring-transparent",
              )}
              aria-hidden
            />
            <div className={cn("min-w-0 flex-1", future && "opacity-55")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-medium">{fulfillmentNodeLabel[node]}</span>
                {record ? (
                  <span className="text-[11px] text-muted-foreground tabular">
                    {formatDateTime(record.createdAt)}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">待进行</span>
                )}
                {current ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    当前
                  </span>
                ) : null}
              </div>
              {record ? (
                <>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    操作人：{record.operatorName}
                  </p>
                  {record.remark ? (
                    <p className="mt-1 text-xs text-muted-foreground">{record.remark}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
