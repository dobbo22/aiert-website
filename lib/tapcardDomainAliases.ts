// Some companies run their website on one domain and their email on another (Burge & Gunson: burgeandgunson.co.uk and
// burgeandgunson.ltd.uk). Verification asks for a mailbox on the card's website domain, so such a company cannot pass without help.
// An alias is an extra email domain accepted for a website domain. It is added by hand, never automatically, and only after checking
// that the company's own website really uses that address (a look-alike domain would otherwise let a stranger verify as the company).
import sql from "@/lib/db";
import { businessDomain } from "@/lib/tapcardDomain";

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_domain_aliases (
        domain TEXT NOT NULL,
        alias TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (domain, alias)
      )`.catch((e) => { ready = null; throw e; });
  }
  return ready;
}

/// The extra email domains accepted for a website domain. Free-mail and other shared domains are ignored even if listed, and a
/// failure to read the list simply means no aliases (verification then works exactly as before).
export async function domainAliases(domain: string): Promise<string[]> {
  const d = domain.trim().toLowerCase();
  if (!d) return [];
  try {
    await ensureSchema();
    const rows = (await sql`SELECT alias FROM tapcard_domain_aliases WHERE domain = ${d}`) as { alias: string }[];
    return rows.map((r) => r.alias.trim().toLowerCase()).filter((a) => a && a !== d && businessDomain(a) === a);
  } catch {
    return [];
  }
}
