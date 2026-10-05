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
  // ICO skipped here (unlike the public favicon endpoint): sharp/libvips
  // can't decode a fair number of real-world .ico files (confirmed against
  // stripe.com's), which silently threw this to the catch below and gave
  // up on a colour entirely. Skipping it falls through to a PNG candidate
  // (apple-touch-icon, or Google's favicon service) that actually decodes.
  const icon = await findSiteIcon(domain, { allowIco: false }).catch(() => null);
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

// sharp's stats().dominant is a single colour for the *whole* image — for a
// typical favicon (a coloured mark on a white or transparent background)
// that's almost always the background, not the mark, so filtering out a
// near-white/near-black/grey *result* just throws the whole icon away
// instead of finding the colour actually in it. This looks pixel-by-pixel
// instead: skip background-like pixels (transparent, near-white, near-
// black, grey), then bucket what's left and take the most common colour.
// An icon with no colour anywhere in it (Apple's logo, say) still
// correctly comes back null — there's nothing to find.
async function dominantColorOf(bytes: Buffer): Promise<string | null> {
  const { data, info } = await sharp(bytes)
    .resize(64, 64, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, number>();
  for (let i = 0; i + 3 < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const isNearWhite = min > 235;
    const isNearBlack = max < 20;
    const isLowSaturation = max - min < 20;
    if (isNearWhite || isNearBlack || isLowSaturation) continue;
    // Quantize (16 levels/channel) so anti-aliased edge pixels land in the
    // same bucket as the solid fill they're blending into.
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  if (buckets.size === 0) return null;

  let bestKey = "";
  let bestCount = 0;
  for (const [key, count] of buckets) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  const [rq, gq, bq] = bestKey.split("-").map(Number);
  const toByte = (q: number) => Math.min(255, (q << 4) | 8);
  return `#${[toByte(rq), toByte(gq), toByte(bq)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
