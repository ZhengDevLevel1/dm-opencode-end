export interface AMapLngLat {
  lng: number;
  lat: number;
  getLng?: () => number;
  getLat?: () => number;
}

export interface AMapMap {
  add: (overlay: unknown) => void;
  remove: (overlay: unknown) => void;
  setCenter: (position: [number, number]) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  resize: () => void;
  destroy: () => void;
  on: (event: string, handler: (event: { lnglat: AMapLngLat }) => void) => void;
}

export interface AMapMarker {
  setPosition: (position: [number, number]) => void;
  getPosition: () => AMapLngLat;
  setMap: (map: AMapMap | null) => void;
  on: (event: string, handler: () => void) => void;
}

export interface AMapRegeocodeResult {
  regeocode?: {
    formattedAddress?: string;
    addressComponent?: {
      province?: string | string[];
      city?: string | string[];
      district?: string | string[];
      township?: string | string[];
    };
  };
}

export interface AMapGeocodeResult {
  geocodes?: Array<{
    location?: AMapLngLat;
    formattedAddress?: string;
    province?: string | string[];
    city?: string | string[];
    district?: string | string[];
    addressComponent?: {
      province?: string | string[];
      city?: string | string[];
      district?: string | string[];
      township?: string | string[];
    };
  }>;
}

export interface AMapGeocoder {
  getAddress: (
    position: [number, number],
    callback: (status: string, result: AMapRegeocodeResult) => void,
  ) => void;
  getLocation: (
    address: string,
    callback: (status: string, result: AMapGeocodeResult) => void,
  ) => void;
}

export interface AMapGeolocationResult {
  position?: AMapLngLat;
}

export interface AMapGeolocation {
  getCurrentPosition: (
    callback: (status: string, result: AMapGeolocationResult) => void,
  ) => void;
}

export interface AMapNamespace {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Geocoder: new (options?: Record<string, unknown>) => AMapGeocoder;
  Geolocation?: new (options?: Record<string, unknown>) => AMapGeolocation;
  plugin?: (plugins: string[], callback?: () => void) => void;
}

export interface PickedLocation {
  longitude: number;
  latitude: number;
  formattedAddress?: string;
  province?: string;
  city?: string;
  district?: string;
  township?: string;
  detailAddress?: string;
  geocoded: boolean;
}

declare global {
  interface Window {
    AMap?: AMapNamespace;
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

const SCRIPT_ID = "amap-js-api";
const SCRIPT_TIMEOUT = 15_000;
const PLUGIN_TIMEOUT = 8_000;

let loaderPromise: Promise<AMapNamespace> | null = null;

export function getAMapKey(): string {
  const key = import.meta.env.VITE_AMAP_KEY?.trim();
  if (!key) throw new Error("请先配置 VITE_AMAP_KEY");
  return key;
}

export function loadAMap(): Promise<AMapNamespace> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<AMapNamespace>((resolve, reject) => {
    const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE?.trim();
    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode };
    }

    const script = document.createElement("script");
    let settled = false;
    let timeoutId = 0;
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.remove();
      reject(new Error(message));
    };
    script.id = SCRIPT_ID;
    script.async = true;
    script.fetchPriority = "high";
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(getAMapKey())}&plugin=AMap.Geocoder,AMap.Geolocation`;
    script.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (window.AMap) resolve(window.AMap);
      else {
        script.remove();
        reject(new Error("高德地图加载失败"));
      }
    };
    script.onerror = () => fail("高德地图脚本加载失败");
    timeoutId = window.setTimeout(() => fail("高德地图脚本加载超时"), SCRIPT_TIMEOUT);
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loaderPromise = null;
    throw error;
  });

  return loaderPromise;
}

export function isDarkTheme(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function mapStyleUrl(): string {
  return isDarkTheme() ? "amap://styles/dark" : "amap://styles/whitesmoke";
}

export function coordinateOf(value: AMapLngLat): [number, number] {
  const lng = typeof value.getLng === "function" ? value.getLng() : value.lng;
  const lat = typeof value.getLat === "function" ? value.getLat() : value.lat;
  return [lng, lat];
}

export function reverseGeocode(
  amap: AMapNamespace,
  longitude: number,
  latitude: number,
): Promise<PickedLocation | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: PickedLocation | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), PLUGIN_TIMEOUT);

    try {
      const geocoder = new amap.Geocoder({ radius: 1000, extensions: "all" });
      geocoder.getAddress([longitude, latitude], (status, result) => {
        window.clearTimeout(timer);
        if (status !== "complete" || !result.regeocode) {
          finish(null);
          return;
        }
        const regeocode = result.regeocode;
        const component = regeocode.addressComponent;
        const province = firstText(component?.province);
        const city = firstText(component?.city) || province;
        const district = firstText(component?.district);
        const formattedAddress = regeocode.formattedAddress?.trim() || undefined;
        finish({
          longitude,
          latitude,
          formattedAddress,
          province,
          city,
          district,
          township: firstText(component?.township),
          detailAddress: deriveDetailAddress(formattedAddress, province, city, district),
          geocoded: Boolean(formattedAddress),
        });
      });
    } catch {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}

export function getCurrentPosition(
  amap: AMapNamespace,
): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: [number, number] | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), PLUGIN_TIMEOUT);

    const run = () => {
      if (!amap.Geolocation) {
        window.clearTimeout(timer);
        finish(null);
        return;
      }
      try {
        const geolocation = new amap.Geolocation({
          enableHighAccuracy: true,
          timeout: PLUGIN_TIMEOUT,
          showButton: false,
          panToLocation: false,
          zoomToAccuracy: false,
        });
        geolocation.getCurrentPosition((status, result) => {
          window.clearTimeout(timer);
          if (status !== "complete" || !result.position) {
            finish(null);
            return;
          }
          finish(coordinateOf(result.position));
        });
      } catch {
        window.clearTimeout(timer);
        finish(null);
      }
    };

    if (amap.Geolocation) run();
    else if (typeof amap.plugin === "function") amap.plugin(["AMap.Geolocation"], run);
    else {
      window.clearTimeout(timer);
      finish(null);
    }
  });
}

export function deriveDetailAddress(
  formattedAddress: string | undefined,
  province?: string,
  city?: string,
  district?: string,
): string | undefined {
  if (!formattedAddress) return undefined;
  let detail = formattedAddress;
  [province, city, district].forEach((part) => {
    if (part && detail.startsWith(part)) detail = detail.slice(part.length);
  });
  return detail.trim() || formattedAddress;
}

function firstText(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) return value.find((item) => Boolean(item));
  return value?.trim() || undefined;
}
