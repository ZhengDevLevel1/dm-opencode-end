export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const SOLID_FOREGROUND = "oklch(99% 0.005 240)";

function hexToRgb(hex: string): Rgb | null {
  if (!HEX_PATTERN.test(hex)) return null;
  const normalized = hex.slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const [red, green, blue] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastWithWhite(luminance: number): number {
  return 1.05 / (luminance + 0.05);
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function solidAccentColor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  let factor = 1;
  let current = rgb;
  while (contrastWithWhite(relativeLuminance(current)) < 4.5 && factor > 0.32) {
    factor -= 0.04;
    current = {
      r: rgb.r * factor,
      g: rgb.g * factor,
      b: rgb.b * factor,
    };
  }

  return factor === 1 ? color : toHex(current);
}

export function buildCustomAccentVars(color: string): Record<string, string> {
  return {
    "--primary": color,
    "--primary-foreground": SOLID_FOREGROUND,
    "--primary-solid": solidAccentColor(color),
    "--primary-solid-foreground": SOLID_FOREGROUND,
    "--ring": color,
    "--sidebar-primary": color,
    "--sidebar-primary-foreground": SOLID_FOREGROUND,
    "--accent": `color-mix(in oklab, ${color} 16%, var(--background))`,
    "--accent-foreground": `color-mix(in oklab, ${color} 62%, var(--foreground))`,
    "--sidebar-accent": `color-mix(in oklab, ${color} 18%, var(--background))`,
    "--sidebar-accent-foreground": `color-mix(in oklab, ${color} 62%, var(--foreground))`,
  };
}
