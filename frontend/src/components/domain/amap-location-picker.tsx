import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPinned } from "lucide-react";
import {
  coordinateOf,
  loadAMap,
  mapStyleUrl,
  reverseGeocode,
  type AMapMap,
  type AMapMarker,
  type PickedLocation,
} from "@/lib/amap";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

const DEFAULT_CENTER: [number, number] = [121.4737, 31.2304];

interface AMapLocationPickerProps {
  longitude?: number;
  latitude?: number;
  onPick: (location: PickedLocation) => void;
  className?: string;
  height?: number;
}

export function AMapLocationPicker({
  longitude,
  latitude,
  onPick,
  className,
  height = 320,
}: AMapLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [resolving, setResolving] = useState(false);
  const [hint, setHint] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const initialPosition = useRef<[number, number] | null>(
    typeof longitude === "number" && typeof latitude === "number"
      ? [longitude, latitude]
      : null,
  );

  useEffect(() => {
    let disposed = false;
    let map: AMapMap | null = null;
    let marker: AMapMarker | null = null;
    let observer: ResizeObserver | null = null;
    const container = containerRef.current;
    if (!container) return;

    setStatus("loading");
    setHint("");

    const ensureMarker = (amap: NonNullable<typeof window.AMap>, position: [number, number]) => {
      if (!marker) {
        marker = new amap.Marker({
          map,
          position,
          draggable: true,
          cursor: "move",
          anchor: "bottom-center",
          title: "送达位置",
        });
        marker.on("dragend", () => {
          if (!marker) return;
          const [lng, lat] = coordinateOf(marker.getPosition());
          void resolvePoint(lng, lat);
        });
      } else {
        marker.setPosition(position);
      }
      return marker;
    };

    const resolvePoint = async (lng: number, lat: number) => {
      ensureMarker(window.AMap!, [lng, lat]);
      setResolving(true);
      const picked = await reverseGeocode(window.AMap!, lng, lat);
      if (disposed) return;
      setResolving(false);
      if (picked?.geocoded) {
        setHint(
          picked.formattedAddress
            ? `已选点：${picked.formattedAddress}`
            : "已选点，地址已回填。",
        );
        onPickRef.current(picked);
      } else {
        setHint("已选点，但地图地址解析失败，请手动补充省市区和详细地址。");
        onPickRef.current({ longitude: lng, latitude: lat, geocoded: false });
      }
    };

    void loadAMap()
      .then((amap) => {
        if (disposed) return;
        map = new amap.Map(container, {
          zoom: 15,
          center: initialPosition.current ?? DEFAULT_CENTER,
          mapStyle: mapStyleUrl(),
          viewMode: "2D",
          resizeEnable: true,
          showLabel: true,
        });
        map.on("click", (event) => {
          const [lng, lat] = coordinateOf(event.lnglat);
          void resolvePoint(lng, lat);
        });
        if (initialPosition.current) {
          ensureMarker(amap, initialPosition.current);
        }
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container);
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      observer?.disconnect();
      marker?.setMap(null);
      map?.destroy();
    };
  }, [attempt]);

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center",
          className,
        )}
        style={{ minHeight: height }}
      >
        <MapPinned className="h-7 w-7 text-muted-foreground opacity-50" />
        <p className="text-sm font-medium">地图暂时不可用</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          可以继续手动填写省市区与详细地址，不影响保存和下单。
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAttempt((value) => value + 1)}
        >
          重新加载地图
        </Button>
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
          正在加载高德地图…
        </div>
      ) : null}
      {resolving ? (
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[11px] shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          正在解析地址
        </div>
      ) : null}
      {status === "ready" ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-start gap-1.5 rounded-lg bg-card/92 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground shadow-sm">
          {hint ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <MapPinned className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>{hint || "点击地图选择送达位置，也可以拖动标记微调。"}</span>
        </div>
      ) : null}
    </div>
  );
}
