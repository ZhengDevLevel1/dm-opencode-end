import { api } from "./api-client";
import type {
  CartAttribution,
  RecommendationEvent,
  RecommendationResponse,
} from "@/types/api";

const SESSION_KEY = "flower.recommendation.session";
const ATTRIBUTION_KEY = "flower.recommendation.attribution";

interface StoredAttribution {
  requestId: string;
  scene?: string;
  strategy?: string;
  position?: number;
  experimentId?: string;
  variant?: string;
}

let clickListenerInstalled = false;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newRecommendationRequestId(): string {
  return `rec-${randomId()}`;
}

export function getRecommendationSessionId(): string {
  if (typeof window === "undefined") return `anon-${randomId()}`;
  let sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s-${randomId()}`;
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function readAttributionMap(): Record<string, StoredAttribution> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredAttribution>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAttributionMap(map: Record<string, StoredAttribution>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(map));
  } catch {
    // storage may be unavailable in private mode
  }
}

export function recommendationAttribution(productId: number): CartAttribution | undefined {
  const stored = readAttributionMap()[String(productId)];
  if (!stored) return undefined;
  return {
    requestId: stored.requestId,
    scene: stored.scene,
    position: stored.position,
    strategy: stored.strategy,
    experimentId: stored.experimentId,
    variant: stored.variant,
  };
}

function sendEvents(events: RecommendationEvent[]) {
  if (events.length === 0) return;
  void api
    .post<{ accepted: number }>("/recommendation-events", { events }, { timeout: 5000 })
    .catch(() => {
      // Tracking must never block the shopping flow.
    });
}

function baseEvent(productId: number, attribution: StoredAttribution): RecommendationEvent {
  return {
    eventId: randomId(),
    requestId: attribution.requestId,
    eventType: "IMPRESSION",
    productId,
    position: attribution.position,
    scene: attribution.scene,
    strategy: attribution.strategy,
    experimentId: attribution.experimentId,
    variant: attribution.variant,
    sessionId: getRecommendationSessionId(),
    occurredAt: new Date().toISOString(),
  };
}

export function rememberRecommendation(response: RecommendationResponse, requestId: string) {
  if (!response?.items?.length) return;
  const map = readAttributionMap();
  const events: RecommendationEvent[] = [];
  response.items.forEach((item, index) => {
    const stored: StoredAttribution = {
      requestId,
      scene: response.scene,
      strategy: item.strategy ?? response.strategy,
      position: item.position ?? index + 1,
      experimentId: item.experimentId ?? response.experimentId,
      variant: item.variant ?? response.variant,
    };
    map[String(item.productId)] = stored;
    events.push({
      ...baseEvent(item.productId, stored),
      eventType: "IMPRESSION",
    });
  });
  writeAttributionMap(map);
  sendEvents(events);
  installClickTracking();
}

export function trackRecommendationClick(productId: number) {
  const stored = readAttributionMap()[String(productId)];
  if (!stored) return;
  sendEvents([{ ...baseEvent(productId, stored), eventType: "CLICK" }]);
}

export function trackRecommendationView(productId: number, dwellMs?: number) {
  const stored = readAttributionMap()[String(productId)];
  if (!stored) return;
  sendEvents([
    {
      ...baseEvent(productId, stored),
      eventType: "VIEW",
      metadata: dwellMs ? { dwellMs } : undefined,
    },
  ]);
}

export function trackRecommendationAddToCart(productId: number, quantity = 1) {
  const stored = readAttributionMap()[String(productId)];
  if (!stored) return;
  sendEvents([
    {
      ...baseEvent(productId, stored),
      eventType: "ADD_TO_CART",
      metadata: { quantity },
    },
  ]);
}

function installClickTracking() {
  if (clickListenerInstalled || typeof document === "undefined") return;
  clickListenerInstalled = true;
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const match = anchor.getAttribute("href")?.match(/^\/products\/(\d+)/);
      if (!match) return;
      trackRecommendationClick(Number(match[1]));
    },
    true,
  );
}
