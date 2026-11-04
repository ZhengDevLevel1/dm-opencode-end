const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE_URL || "").replace(/\/+$/, "");

export function resolveImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (IMAGE_BASE) return `${IMAGE_BASE}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  return null;
}

export function gradientFor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  const second = (hash + 68) % 360;
  return `linear-gradient(150deg, oklch(88% 0.055 ${hash}), oklch(94% 0.03 ${second}))`;
}
