// A logo picked by hand for a website whose own logo cannot be read well (a white logo on a transparent background, or a site that
// blocks our reader). /api/logo serves it ahead of anything read from the site, so it shows as the banner on the web card page and in
// both apps. Added by hand (SQL), one row per website domain; a failure to read the table simply means no override.
import sql from "@/lib/db";

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_domain_logos (
        domain TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`.catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/// The logo address set for a website domain, or null. Only https addresses are used.
export async function domainLogoUrl(domain: string): Promise<string | null> {
  const d = domain.trim().toLowerCase();
  if (!d) return null;
  try {
    await ensureSchema();
    const rows = (await sql`SELECT url FROM tapcard_domain_logos WHERE domain = ${d} LIMIT 1`) as { url: string }[];
    const url = rows[0]?.url ?? "";
    return /^https:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

/// The hand-set logo for a website domain (tried with www. added or removed), read as an image: for the company logo button, so a site
/// that blocks our reader or has no logo it declares still gets the logo that was set for it. null when none is set or it cannot be read.
export async function domainLogoImage(domain: string, fetcher: typeof fetch = fetch): Promise<{ bytes: Buffer; contentType: string } | null> {
  const d = domain.trim().toLowerCase();
  const alt = d.startsWith("www.") ? d.slice(4) : `www.${d}`;
  const url = (await domainLogoUrl(d)) ?? (await domainLogoUrl(alt));
  if (!url) return null;
  const res = await fetcher(url, { signal: AbortSignal.timeout(6000) }).catch(() => null);
  if (!res?.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "image/png").split(";")[0].trim().toLowerCase();
  if (!["image/png", "image/jpeg", "image/webp"].includes(contentType)) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  return bytes.length > 0 && bytes.length <= 2 * 1024 * 1024 ? { bytes, contentType } : null;
}
