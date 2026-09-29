import type { TapCardRecord } from "@/lib/tapcardDb";

// Plain helpers shared by the Apple and Google passes and the card API.
// Kept free of image libraries on purpose: sharp and resvg ship native
// binaries that are only bundled for the routes that render pass images
// (next.config.ts), and a route importing them without that crashes on load.

export const PASS_STYLES = ["artwork", "photo", "brand"] as const;
export type PassStyle = (typeof PASS_STYLES)[number];

export function parsePassStyle(value: unknown): PassStyle | undefined {
  return PASS_STYLES.find((s) => s === value);
}

/// "photo" needs a photo; without one the card gets the artwork instead.
export function effectiveStyle(card: Pick<TapCardRecord, "pass_style" | "photo_url">, override?: PassStyle): PassStyle {
  const style = override ?? parsePassStyle(card.pass_style) ?? "artwork";
  return style === "photo" && !card.photo_url ? "artwork" : style;
}

/// True when one name contains the other, ignoring case, spaces and
/// punctuation — e.g. card "Hobart Capital" vs company "Hobart Capital Ltd".
export function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
}

// Same rule as the iOS app: only a card named "Personal" counts as personal.
export function isPersonalCard(card: TapCardRecord): boolean {
  return /personal/i.test(card.label);
}
