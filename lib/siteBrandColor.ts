import sharp from "sharp";
import { findSiteIcon, normalizeDomain } from "@/lib/siteIcon";

// What a card's website field resolves to automatically, as it's created:
// the company's own brand colour (for the "brand" pass style) and, where a
// site publishes it as proper schema.org structured data, its address.
// Both come from the one homepage fetch findSiteIcon() already does for
// the company icon, so resolving them together costs nothing extra over
// resolving either alone.
//
// Colour: the page's own <meta name="theme-color"> if it declares one,
// otherwise the dominant colour of its own icon (sharp's stats().dominant
// — no extra colour-quantization dependency needed, it's already built
// in). Deliberately not AI/"Apple Intelligence": extracting a precise
// colour from an image is a pixel-maths problem with an exact,
// deterministic answer, not a language one.
//
// Address: only from schema.org JSON-LD (lib/siteIcon.ts's jsonLdAddress)
// — never scraped from free text. An address ends up printed on someone's
// business card, so a wrong guess is worse than no address at all; an
// unambiguous, machine-authored source is the bar, not "AI reads the
// footer and has a go."
export interface SiteBranding {
  color: string | null;
  address: string | null;
}

export async function resolveSiteBranding(websiteOrDomain: string): Promise<SiteBranding> {
  const domain = normalizeDomain(stripToHost(websiteOrDomain));
  if (!domain) return { color: null, address: null };
  const icon = await findSiteIcon(domain).catch(() => null);
  if (!icon) return { color: null, address: null };
  const color = icon.themeColor ?? (await dominantColorOf(icon.bytes).catch(() => null));
  return { color, address: icon.address };
}

export async function resolveBrandColor(websiteOrDomain: string): Promise<string | null> {
  return (await resolveSiteBranding(websiteOrDomain)).color;
}

function stripToHost(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(/^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return trimmed;
  }
}

async function dominantColorOf(bytes: Buffer): Promise<string | null> {
  // .ico files can hold multiple sizes in one file — sharp reads the first,
  // which is fine here (any size gives the same dominant colour).
  const { dominant } = await sharp(bytes).stats();
  if (!dominant) return null;
  const { r, g, b } = dominant;
  // Most favicons are white/near-white padding around a mark — a washed-out
  // "brand colour" of #fefefe is worse than just falling back to the
  // default gradient, so this is treated as no result rather than returned.
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const isNearWhite = min > 235;
  const isNearBlack = max < 20;
  const isLowSaturation = max - min < 12 && max > 40 && max < 235;
  if (isNearWhite || isNearBlack || isLowSaturation) return null;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
