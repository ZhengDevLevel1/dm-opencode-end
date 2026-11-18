import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, LocateFixed, MapPinned } from "lucide-react";
import {
  coordinateOf,
  deriveDetailAddress,
  getCurrentPosition,
  loadAMap,
  mapStyleUrl,
  reverseGeocode,
  type AMapMap,
  type AMapMarker,
  type PickedLocation,
} from "@/lib/amap";
import { normalizeRegionParts } from "@/lib/china-regions";
import { cn } from "@/lib/cn";
import { useMapSnapPreference } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const DEFAULT_CENTER: [number, number] = [121.4737, 31.2304];
const LIVE_GEOCODE_DELAY = 600;
const MAP_PICK_GUARD_MS = 1000;

interface AMapLocationPickerProps {
  longitude?: number;
  latitude?: number;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  onPick: (location: PickedLocation) => void;
  className?: string;
  height?: number;
}

interface PickerApi {
  showPosition: (position: [number, number], center: boolean) => void;
  clearPosition: () => void;
  geocode: (query: string, fillParts: boolean, contextCity?: string) => void;
  locate: () => void;
}

type AddressTextField = "province" | "city" | "district" | "detailAddress";

const REGION_HINT_PATTERN = /[\u4e00-\u9fa5]{2,}(省|市|区|县|旗)/;

function buildAddressQuery(parts: Array<string | undefined>): string {
  const segments: string[] = [];
  for (const part of parts) {
    const text = part?.trim();
    if (!text || segments[segments.length - 1] === text) continue;
    segments.push(text);
  }
  return segments.join("");
}

function firstText(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value.find((item) => Boolean(item));
  return value?.trim() || undefined;
}

function normalizePicked(picked: PickedLocation): PickedLocation {
  const normalized = normalizeRegionParts({
    province: picked.province,
    city: picked.city,
    district: picked.district,
    township: picked.township,
    formattedAddress: picked.formattedAddress,
  });
  if (
    normalized.province === picked.province &&
    normalized.city === picked.city &&
    normalized.district === picked.district
  ) {
    return picked;
  }
  return {
    ...picked,
    province: normalized.province,
    city: normalized.city,
    district: normalized.district,
    detailAddress: deriveDetailAddress(
      picked.formattedAddress,
      normalized.province,
      normalized.city,
      normalized.district,
    ),
  };
}

function cityContextForDetail(detail: string, city: string): string | undefined {
  const cityText = city.trim();
  const useCityContext =
    !REGION_HINT_PATTERN.test(detail) ||
    (cityText !== "" && detail.includes(cityText));
  return useCityContext ? cityText || undefined : undefined;
}

function geocodeContextCity(city?: string, district?: string): string {
  const cityText = city?.trim() ?? "";
  if (cityText.includes("直辖县级行政区划")) {
    return district?.trim() ?? "";
  }
  return cityText;
}

export function AMapLocationPicker({
  longitude,
  latitude,
  province,
  city,
  district,
  detailAddress,
  onPick,
  className,
  height = 320,
}: AMapLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<PickerApi | null>(null);
  const onPickRef = useRef(onPick);
  const {
    snapToLandmark,
    setSnapToLandmark,
    isLoading: snapPreferenceLoading,
  } = useMapSnapPreference();
  const coordsRef = useRef<{ longitude?: number; latitude?: number }>({});
  const textRef = useRef({ province, city, district, detailAddress });
  const changedTextFieldsRef = useRef<Record<AddressTextField, boolean>>({
    province: false,
    city: false,
    district: false,
    detailAddress: false,
  });
  const lastGeocodeQueryRef = useRef<string | null>(null);
  const lastMapPickAtRef = useRef(0);
  const readyGeocodeRef = useRef(true);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [attempt, setAttempt] = useState(0);
  const snapToLandmarkRef = useRef(snapToLandmark);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    snapToLandmarkRef.current = snapToLandmark;
  }, [snapToLandmark]);

  useEffect(() => {
    coordsRef.current = { longitude, latitude };
    const previous = textRef.current;
    changedTextFieldsRef.current = {
      province: (province ?? "") !== (previous.province ?? ""),
      city: (city ?? "") !== (previous.city ?? ""),
      district: (district ?? "") !== (previous.district ?? ""),
      detailAddress: (detailAddress ?? "") !== (previous.detailAddress ?? ""),
    };
    textRef.current = { province, city, district, detailAddress };
  }, [city, detailAddress, district, latitude, longitude, province]);

  useEffect(() => {
    let disposed = false;
    let map: AMapMap | null = null;
    let marker: AMapMarker | null = null;
    let observer: ResizeObserver | null = null;
    let geocodeSeq = 0;
    const container = containerRef.current;
    if (!container) return;

    setStatus("loading");
    setBusyLabel(null);
    setHint("");
    apiRef.current = null;
    readyGeocodeRef.current = true;

    const ensureMarker = (position: [number, number]) => {
      if (disposed || !map) return;
      if (marker) {
        marker.setPosition(position);
        return;
      }
      marker = new window.AMap!.Marker({
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
    };

    const applyPick = (picked: PickedLocation) => {
      const current = textRef.current;
      lastGeocodeQueryRef.current = buildAddressQuery([
        picked.province ?? current.province,
        picked.city ?? current.city,
        picked.district ?? current.district,
        picked.detailAddress ?? current.detailAddress,
      ]);
      onPickRef.current(picked);
    };

    const finishGeocode = (
      picked: PickedLocation,
      query: string,
      formatted: string | undefined,
      fillParts: boolean,
      snap = false,
    ) => {
      setBusyLabel(null);
      const filledParts = Boolean(
        fillParts && (picked.province || picked.city || picked.district),
      );
      setHint(
        snap
          ? `已自动跳转至最近地标：${formatted || query}`
          : filledParts
            ? `已按详细地址补全省市区：${formatted || query}`
            : `已按文字地址定位：${formatted || query}`,
      );
      applyPick(picked);
    };

    const runGeocode = (
      query: string,
      fillParts: boolean,
      contextCity?: string,
      snap = false,
    ) => {
      if (disposed || !map || !window.AMap) return;
      const seq = ++geocodeSeq;
      setBusyLabel("正在按地址定位…");
      const geocoder = new window.AMap.Geocoder({
        radius: 1000,
        ...(contextCity ? { city: contextCity } : {}),
      });
      geocoder.getLocation(query, (codeStatus, result) => {
        if (disposed || seq !== geocodeSeq) return;
        const geocode = result?.geocodes?.[0];
        if (codeStatus !== "complete" || !geocode?.location) {
          setBusyLabel(null);
          setHint(
            snap
              ? "已选点，但未能自动跳转地标。"
              : "未找到该文字地址对应的位置，可点击地图手动选点。",
          );
          return;
        }
        const [lng, lat] = coordinateOf(geocode.location);
        ensureMarker([lng, lat]);
        map?.setCenter([lng, lat]);
        const formatted = geocode.formattedAddress?.trim();
        const component = geocode.addressComponent;
        const raw: PickedLocation = {
          longitude: lng,
          latitude: lat,
          formattedAddress: formatted,
          township: firstText(component?.township),
          geocoded: Boolean(formatted),
        };
        if (fillParts) {
          raw.province = firstText(geocode.province) ?? firstText(component?.province);
          raw.city = firstText(geocode.city) ?? firstText(component?.city);
          raw.district = firstText(geocode.district) ?? firstText(component?.district);
        }
        const picked = fillParts ? normalizePicked(raw) : raw;
        if (fillParts && (!picked.province || !picked.city || !picked.district)) {
          void reverseGeocode(window.AMap!, lng, lat).then((reverse) => {
            if (disposed || seq !== geocodeSeq) return;
            if (reverse) {
              const normalizedReverse = normalizePicked(reverse);
              picked.province = picked.province ?? normalizedReverse.province;
              picked.city = picked.city ?? normalizedReverse.city;
              picked.district = picked.district ?? normalizedReverse.district;
            }
            finishGeocode(picked, query, formatted, fillParts, snap);
          });
          return;
        }
        finishGeocode(picked, query, formatted, fillParts, snap);
      });
    };

    const resolvePoint = async (lng: number, lat: number, center = false) => {
      const seq = ++geocodeSeq;
      ensureMarker([lng, lat]);
      if (center) map?.setCenter([lng, lat]);
      setBusyLabel("正在解析地址…");
      const reverse = await reverseGeocode(window.AMap!, lng, lat);
      if (disposed || seq !== geocodeSeq) return;
      setBusyLabel(null);
      const picked = reverse ? normalizePicked(reverse) : null;
      lastMapPickAtRef.current = Date.now();
      if (picked?.geocoded) {
        setHint(
          picked.formattedAddress
            ? `已选点：${picked.formattedAddress}`
            : "已选点，地址已回填。",
        );
        applyPick(picked);
        if (snapToLandmarkRef.current && picked.detailAddress) {
          const contextCity = cityContextForDetail(
            picked.detailAddress,
            geocodeContextCity(picked.city, picked.district),
          );
          runGeocode(picked.detailAddress, true, contextCity, true);
        }
      } else {
        setHint("已选点，但地图地址解析失败，请手动补充省市区和详细地址。");
        applyPick({ longitude: lng, latitude: lat, geocoded: false });
      }
    };

    const locate = async () => {
      if (disposed || !window.AMap) return;
      const seq = ++geocodeSeq;
      setBusyLabel("正在获取当前位置…");
      const position = await getCurrentPosition(window.AMap);
      if (disposed || seq !== geocodeSeq) return;
      if (!position) {
        setBusyLabel(null);
        setHint("定位失败，请允许浏览器获取位置权限，或手动点击地图选点。");
        return;
      }
      await resolvePoint(position[0], position[1], true);
    };

    void loadAMap()
      .then((amap) => {
        if (disposed) return;
        const initial = coordsRef.current;
        const hasInitial =
          typeof initial.longitude === "number" && typeof initial.latitude === "number";
        const center: [number, number] = hasInitial
          ? [initial.longitude as number, initial.latitude as number]
          : DEFAULT_CENTER;
        map = new amap.Map(container, {
          zoom: 15,
          center,
          mapStyle: mapStyleUrl(),
          viewMode: "2D",
          resizeEnable: true,
          showLabel: true,
        });
        if (hasInitial) ensureMarker(center);
        map.on("click", (event) => {
          const [lng, lat] = coordinateOf(event.lnglat);
          void resolvePoint(lng, lat);
        });
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container);
        apiRef.current = {
          showPosition: (position, shouldCenter) => {
            ensureMarker(position);
            if (shouldCenter) map?.setCenter(position);
          },
          clearPosition: () => {
            geocodeSeq += 1;
            marker?.setMap(null);
            marker = null;
            setBusyLabel(null);
          },
          geocode: runGeocode,
          locate: () => {
            void locate();
          },
        };
        const current = textRef.current;
        lastGeocodeQueryRef.current = hasInitial
          ? buildAddressQuery([
              current.province,
              current.city,
              current.district,
              current.detailAddress,
            ])
          : "";
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      apiRef.current = null;
      observer?.disconnect();
      marker?.setMap(null);
      map?.destroy();
    };
  }, [attempt]);

  useEffect(() => {
    if (status !== "ready") return;
    const api = apiRef.current;
    if (!api) return;
    if (typeof longitude === "number" && typeof latitude === "number") {
      api.showPosition([longitude, latitude], true);
    } else {
      api.clearPosition();
    }
  }, [latitude, longitude, status]);

  useEffect(() => {
    if (status !== "ready") return;
    const detail = detailAddress?.trim() ?? "";
    const detailChanged = changedTextFieldsRef.current.detailAddress && Boolean(detail);
    const query = detailChanged
      ? detail
      : buildAddressQuery([province, city, district, detail]);
    if (!query) return;
    if (Date.now() - lastMapPickAtRef.current < MAP_PICK_GUARD_MS) {
      lastGeocodeQueryRef.current = query;
      return;
    }
    if (query === lastGeocodeQueryRef.current) return;
    if (readyGeocodeRef.current) {
      readyGeocodeRef.current = false;
      const changed = changedTextFieldsRef.current;
      const changedCount =
        Number(changed.province) +
        Number(changed.city) +
        Number(changed.district) +
        Number(changed.detailAddress);
      if (changedCount > 1) {
        lastGeocodeQueryRef.current = query;
        return;
      }
    }
    const contextCity = detailChanged
      ? cityContextForDetail(detail, geocodeContextCity(city, district))
      : undefined;
    const timer = window.setTimeout(() => {
      apiRef.current?.geocode(query, detailChanged, contextCity);
    }, LIVE_GEOCODE_DELAY);
    return () => window.clearTimeout(timer);
  }, [city, detailAddress, district, province, status]);

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
          可以继续手动选择省市区并填写详细地址，不影响保存和下单。
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
      {status === "ready" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-3 top-3 border-border/60 bg-card/95 shadow-sm backdrop-blur hover:bg-card"
          title="定位到当前位置"
          aria-label="定位到当前位置"
          disabled={Boolean(busyLabel)}
          onClick={() => apiRef.current?.locate()}
        >
          {busyLabel === "正在获取当前位置…" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          当前位置
        </Button>
      ) : null}
      {status === "ready" ? (
        <div
          className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-card/95 px-2.5 py-1 text-[11px] shadow-sm"
          title="开启后，选点会自动跳转到最近的地标；关闭则保留点击位置"
        >
          <Switch
            id="amap-snap-landmark"
            checked={snapToLandmark}
            disabled={snapPreferenceLoading}
            onCheckedChange={(checked) => {
              snapToLandmarkRef.current = checked;
              setSnapToLandmark(checked);
            }}
            label="自动跳转最近地标"
          />
          <label
            htmlFor="amap-snap-landmark"
            className="cursor-pointer select-none text-muted-foreground"
          >
            自动跳转地标
          </label>
        </div>
      ) : null}
      {busyLabel && busyLabel !== "正在获取当前位置…" ? (
        <div className="absolute left-3 top-14 flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[11px] shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          {busyLabel}
        </div>
      ) : null}
      {status === "ready" ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-start gap-1.5 rounded-lg bg-card/92 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground shadow-sm">
          {hint ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <MapPinned className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {hint ||
              "点击地图或拖动标记选点；开启「自动跳转地标」后会吸附最近地标。"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
