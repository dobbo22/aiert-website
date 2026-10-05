// One extracted brand hex colour (lib/siteBrandColor.ts) → the same
// three-stop gradient + accent-tint shape as TapCard's own default
// navy→violet+gold scheme: a dark anchor, the brand hue mid-gradient, a
// richer deep tone, and a light, saturated tint for text/rule elements —
// always readable against a dark background regardless of how light or
// dark the source colour was. No dependencies, so both the server-rendered
// pass art (lib/tapcardPassArt.ts) and the public web card page can use it.

const GOLD = "#f6d27a";

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r0, g0, b0] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to255 = (v: number) => Math.round((v + m) * 255);
  return `#${[to255(r0), to255(g0), to255(b0)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export interface BrandPalette {
  gradStart: string;
  gradMid: string;
  gradEnd: string;
  accent: string;
}

export const DEFAULT_PALETTE: BrandPalette = { gradStart: "#1a2138", gradMid: "#2a2350", gradEnd: "#422975", accent: GOLD };

export function paletteFor(brandColor: string | null | undefined): BrandPalette {
  if (!brandColor || !/^#[0-9a-f]{6}$/i.test(brandColor)) return DEFAULT_PALETTE;
  const [h, s] = hexToHsl(brandColor);
  // Saturation floor: a near-grey source colour (a monochrome logo, say)
  // would otherwise produce a muddy, lifeless gradient.
  const sat = Math.max(s, 0.35);
  return {
    gradStart: hslToHex(h, sat * 0.85, 0.16),
    gradMid: hslToHex(h, sat, 0.26),
    gradEnd: hslToHex((h + 12) % 360, Math.min(1, sat * 1.1), 0.37),
    accent: hslToHex(h, Math.min(1, sat * 0.9), 0.78),
  };
}
