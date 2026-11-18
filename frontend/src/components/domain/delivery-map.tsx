import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  LocateFixed,
  MapPinned,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { loadAMap, mapStyleUrl, type AMapMap, type AMapMarker } from "@/lib/amap";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const DEFAULT_ZOOM = 16;
const MIN_ZOOM = 5;
const MAX_ZOOM = 20;

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
  const mapRef = useRef<AMapMap | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const hasCoordinate = typeof longitude === "number" && typeof latitude === "number";

  useEffect(() => {
    if (!hasCoordinate) return;
    let disposed = false;
    let map: AMapMap | null = null;
    let marker: AMapMarker | null = null;
    const container = containerRef.current;
    if (!container) return;

    setStatus("loading");
    setZoom(DEFAULT_ZOOM);
    void loadAMap()
      .then((amap) => {
        if (disposed) return;
        const position: [number, number] = [longitude, latitude];
        map = new amap.Map(container, {
          zoom: DEFAULT_ZOOM,
          center: position,
          mapStyle: mapStyleUrl(),
          viewMode: "2D",
          resizeEnable: true,
          dragEnable: true,
          zoomEnable: true,
          doubleClickZoom: true,
          scrollWheel: true,
        });
        marker = new amap.Marker({
          map,
          position,
          anchor: "bottom-center",
          title: address || "送达位置",
        });
        mapRef.current = map;
        map.on("zoomend", () => {
          if (disposed) return;
          setZoom(map?.getZoom() ?? DEFAULT_ZOOM);
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      mapRef.current = null;
      marker?.setMap(null);
      map?.destroy();
    };
  }, [address, hasCoordinate, latitude, longitude]);

  const changeZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + delta));
    map.setZoom(next);
    setZoom(next);
  };

  const resetView = () => {
    const map = mapRef.current;
    if (!map || typeof longitude !== "number" || typeof latitude !== "number") return;
    map.setZoom(DEFAULT_ZOOM);
    map.setCenter([longitude, latitude]);
    setZoom(DEFAULT_ZOOM);
  };

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

  const controlClass =
    "border-border/60 bg-card/95 shadow-sm backdrop-blur hover:bg-card";

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
      {status === "ready" ? (
        <>
          <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              className={controlClass}
              title="放大地图"
              aria-label="放大地图"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => changeZoom(1)}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className={controlClass}
              title="缩小地图"
              aria-label="缩小地图"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => changeZoom(-1)}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className={controlClass}
              title="回到送达位置"
              aria-label="回到送达位置"
              onClick={resetView}
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
          </div>
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-card/92 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm">
            拖动查看周边，滚轮或按钮缩放
          </div>
        </>
      ) : null}
    </div>
  );
}
