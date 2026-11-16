import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPinned } from "lucide-react";
import { loadAMap, mapStyleUrl, type AMapMap, type AMapMarker } from "@/lib/amap";
import { cn } from "@/lib/cn";

interface DeliveryMapProps {
  longitude?: number;
  latitude?: number;
  address?: string;
  height?: number;
  className?: string;
}

export function DeliveryMap({
  longitude,
  latitude,
  address,
  height = 260,
  className,
}: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const hasCoordinate = typeof longitude === "number" && typeof latitude === "number";

  useEffect(() => {
    if (!hasCoordinate) return;
    let disposed = false;
    let map: AMapMap | null = null;
    let marker: AMapMarker | null = null;
    const container = containerRef.current;
    if (!container) return;

    setStatus("loading");
    void loadAMap()
      .then((amap) => {
        if (disposed) return;
        const position: [number, number] = [longitude, latitude];
        map = new amap.Map(container, {
          zoom: 16,
          center: position,
          mapStyle: mapStyleUrl(),
          viewMode: "2D",
          resizeEnable: true,
          scrollWheel: false,
        });
        marker = new amap.Marker({
          map,
          position,
          anchor: "bottom-center",
          title: address || "送达位置",
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      marker?.setMap(null);
      map?.destroy();
    };
  }, [address, hasCoordinate, latitude, longitude]);

  if (!hasCoordinate) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center",
          className,
        )}
        style={{ minHeight: height }}
      >
        <MapPinned className="h-7 w-7 text-muted-foreground opacity-50" />
        <p className="text-sm font-medium">这笔订单没有地图坐标</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          订单可能创建于地址簿地图选点上线之前，请按上方文字地址配送。
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60 bg-muted/20",
        className,
      )}
      style={{ height }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/80 text-xs text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          正在加载配送地图…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/92 px-4 text-center">
          <AlertCircle className="h-6 w-6 text-warning" />
          <p className="text-sm font-medium">地图暂时不可用</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            请按收花信息中的文字地址配送，坐标仍已记录。
          </p>
        </div>
      ) : null}
    </div>
  );
}
