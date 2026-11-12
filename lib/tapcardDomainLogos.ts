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
