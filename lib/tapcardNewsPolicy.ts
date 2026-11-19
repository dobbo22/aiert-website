// Who may post what on a company's card. A headline is either Regulatory (an RNS or other regulatory announcement) or General (events,
// webcasts, meeting invitations). Regulatory posts need a Senior admin, must carry a link, and are checked against the company's own
// announcements page (the page the Headlines screen already watches). A company can also switch on a second approval: one admin writes it,
// a different Senior admin approves it. Every step is written to an audit trail that this code never edits or deletes.
import sql from "@/lib/db";
import { ensureSchema as ensureBizSchema } from "@/lib/tapcardBiz";

export type NewsKind = "rns" | "general";
export const cleanKind = (v: unknown): NewsKind => (v === "rns" ? "rns" : "general");

let ready: Promise<unknown> | null = null;
export function ensurePolicySchema(): Promise<unknown> {
  if (!ready) {
    ready = ensureBizSchema()
      .then(() => sql`ALTER TABLE tapcard_biz_orgs ADD COLUMN IF NOT EXISTS news_rns_approval BOOLEAN NOT NULL DEFAULT false`)
      .then(() => sql`ALTER TABLE tapcard_biz_admins ADD COLUMN IF NOT EXISTS senior BOOLEAN NOT NULL DEFAULT true`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_news_audit (
          id BIGSERIAL PRIMARY KEY,
          at TIMESTAMPTZ NOT NULL DEFAULT now(),
          org_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          action TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'general',
          actor TEXT NOT NULL,
          text TEXT NOT NULL DEFAULT '',
          link TEXT NOT NULL DEFAULT '',
          groups TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          detail JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `)
      .then(() => sql`CREATE INDEX IF NOT EXISTS tapcard_news_audit_org ON tapcard_news_audit (org_id, at DESC)`)
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_news_drafts (
          id BIGSERIAL PRIMARY KEY,
          org_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          text TEXT NOT NULL,
          link TEXT NOT NULL DEFAULT '',
          groups TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          status TEXT NOT NULL DEFAULT 'pending',
          decided_by TEXT NOT NULL DEFAULT '',
          decided_at TIMESTAMPTZ,
          note TEXT NOT NULL DEFAULT '',
          website_status TEXT NOT NULL DEFAULT ''
        )
      `)
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

// ---- the check against the company's own website

/// Compares two addresses ignoring http/https, www, a trailing slash, #fragments and tracking parameters.
export function sameAnnouncementUrl(a: string, b: string): boolean {
  const norm = (raw: string): string | null => {
    try {
      const u = new URL(raw.trim());
      if (!/^https?:$/.test(u.protocol)) return null;
      const keep = [...u.searchParams.entries()].filter(([k]) => !/^(utm_|fbclid|gclid|mc_)/i.test(k)).sort(([x], [y]) => x.localeCompare(y));
      const q = keep.length ? "?" + keep.map(([k, v]) => `${k}=${v}`).join("&") : "";
      return `${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${q}`;
    } catch { return null; }
  };
  const x = norm(a), y = norm(b);
  return !!x && x === y;
}

const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2));
/// True when the headline and the website's title share most of their words (a headline is often a shortened title).
export function headlineMatchesTitle(headline: string, title: string): boolean {
  const h = words(headline), t = words(title);
  if (!h.size || !t.size) return false;
  let shared = 0;
  for (const w of h) if (t.has(w)) shared++;
  return shared / Math.min(h.size, t.size) >= 0.6;
}

export type WebsiteCheck =
  | { status: "found"; title: string; titleMatches: boolean }
  | { status: "not-found" }
  | { status: "no-feed" }       // the company has not set an announcements page to watch
  | { status: "no-link" };

/// Is this link on the company's announcements page (read fresh when the last read is over 30 seconds old)? This is the check an automated
/// RNS post would later rely on: nothing is posted for the company unless its own website shows the announcement.
export async function checkAgainstWebsite(cardId: string, link: string, headline: string): Promise<WebsiteCheck> {
  if (!link.trim()) return { status: "no-link" };
  const feed = await import("@/lib/tapcardIrFeed");
  const cfg = await feed.syncFeed(cardId, 30_000).catch(() => null);
  if (!cfg) return { status: "no-feed" };
  const rows = (await sql`SELECT url, title FROM tapcard_ir_items WHERE card_id = ${cardId} ORDER BY published DESC NULLS LAST, first_seen_at DESC LIMIT 100`) as { url: string; title: string }[];
  const hit = rows.find((r) => sameAnnouncementUrl(r.url, link));
  return hit ? { status: "found", title: hit.title, titleMatches: headlineMatchesTitle(headline, hit.title) } : { status: "not-found" };
}

// ---- who is senior, and the approval setting

/// AIERT support is never senior: it cannot post regulatory news for a company.
export async function isSenior(orgId: string, email: string, support = false): Promise<boolean> {
  if (support) return false;
  await ensurePolicySchema();
  const r = (await sql`SELECT senior, role FROM tapcard_biz_admins WHERE org_id = ${orgId} AND email = ${email.toLowerCase()} LIMIT 1`) as { senior: boolean; role: string }[];
  return !!r[0] && r[0].role !== "manager" && r[0].senior !== false;
}

export async function approvalRequired(orgId: string): Promise<boolean> {
  await ensurePolicySchema();
  const r = (await sql`SELECT news_rns_approval FROM tapcard_biz_orgs WHERE id = ${orgId}`) as { news_rns_approval: boolean }[];
  return r[0]?.news_rns_approval === true;
}

export async function setApprovalRequired(orgId: string, on: boolean): Promise<void> {
  await ensurePolicySchema();
  await sql`UPDATE tapcard_biz_orgs SET news_rns_approval = ${on} WHERE id = ${orgId}`;
}

/// A company can never be left with nobody senior (nobody could post or approve regulatory news).
export async function setSenior(orgId: string, email: string, on: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensurePolicySchema();
  if (!on) {
    const others = (await sql`SELECT 1 FROM tapcard_biz_admins WHERE org_id = ${orgId} AND role <> 'manager' AND senior AND email <> ${email.toLowerCase()}`) as unknown[];
    if (!others.length) return { ok: false, error: "At least one admin must stay senior." };
  }
  await sql`UPDATE tapcard_biz_admins SET senior = ${on} WHERE org_id = ${orgId} AND email = ${email.toLowerCase()} AND role <> 'manager'`;
  return { ok: true };
}

export async function seniorAdmins(orgId: string): Promise<{ email: string; senior: boolean }[]> {
  await ensurePolicySchema();
  return (await sql`SELECT email, senior FROM tapcard_biz_admins WHERE org_id = ${orgId} AND role <> 'manager' ORDER BY created_at, id`) as { email: string; senior: boolean }[];
}

// ---- audit trail

export interface AuditEntry { orgId: string; cardId: string; action: string; kind: NewsKind; actor: string; text?: string; link?: string; groups?: string[]; detail?: Record<string, unknown> }
export async function audit(e: AuditEntry): Promise<void> {
  await ensurePolicySchema();
  await sql`INSERT INTO tapcard_news_audit (org_id, card_id, action, kind, actor, text, link, groups, detail)
    VALUES (${e.orgId}, ${e.cardId}, ${e.action}, ${e.kind}, ${e.actor}, ${e.text ?? ""}, ${e.link ?? ""}, ${e.groups ?? []}::text[], ${JSON.stringify(e.detail ?? {})}::jsonb)`;
}

export interface AuditRow { id: number; at: string; action: string; kind: string; actor: string; text: string; link: string; groups: string[]; detail: Record<string, unknown> }
export async function listAudit(orgId: string, limit = 50): Promise<AuditRow[]> {
  await ensurePolicySchema();
  const rows = (await sql`SELECT id, at, action, kind, actor, text, link, groups, detail FROM tapcard_news_audit WHERE org_id = ${orgId} ORDER BY id DESC LIMIT ${limit}`) as (Omit<AuditRow, "at" | "id"> & { at: string | Date; id: number | string })[];
  return rows.map((r) => ({ ...r, id: Number(r.id), at: new Date(r.at).toISOString() }));
}

/// The kind of the card's most recent post, for the rule that only a senior admin may withdraw a regulatory one.
export async function lastPostedKind(orgId: string, cardId: string): Promise<NewsKind> {
  await ensurePolicySchema();
  const r = (await sql`SELECT kind FROM tapcard_news_audit WHERE org_id = ${orgId} AND card_id = ${cardId} AND action = 'posted' ORDER BY id DESC LIMIT 1`) as { kind: string }[];
  return cleanKind(r[0]?.kind);
}

// ---- drafts waiting for a second approval

export interface Draft { id: number; cardId: string; kind: NewsKind; text: string; link: string; groups: string[]; createdBy: string; createdAt: string; status: string; websiteStatus: string }
const toDraft = (r: Record<string, unknown>): Draft => ({ id: Number(r.id), cardId: String(r.card_id), kind: cleanKind(r.kind), text: String(r.text), link: String(r.link), groups: (r.groups as string[]) ?? [], createdBy: String(r.created_by), createdAt: new Date(r.created_at as string).toISOString(), status: String(r.status), websiteStatus: String(r.website_status) });

export async function createDraft(d: { orgId: string; cardId: string; kind: NewsKind; text: string; link: string; groups: string[]; createdBy: string; websiteStatus: string }): Promise<number> {
  await ensurePolicySchema();
  const r = (await sql`INSERT INTO tapcard_news_drafts (org_id, card_id, kind, text, link, groups, created_by, website_status)
    VALUES (${d.orgId}, ${d.cardId}, ${d.kind}, ${d.text}, ${d.link}, ${d.groups}::text[], ${d.createdBy}, ${d.websiteStatus}) RETURNING id`) as { id: number | string }[];
  return Number(r[0].id);
}
export async function pendingDrafts(orgId: string): Promise<Draft[]> {
  await ensurePolicySchema();
  return ((await sql`SELECT * FROM tapcard_news_drafts WHERE org_id = ${orgId} AND status = 'pending' ORDER BY id`) as Record<string, unknown>[]).map(toDraft);
}
export async function getDraft(orgId: string, id: number): Promise<Draft | null> {
  await ensurePolicySchema();
  const r = (await sql`SELECT * FROM tapcard_news_drafts WHERE org_id = ${orgId} AND id = ${id}`) as Record<string, unknown>[];
  return r[0] ? toDraft(r[0]) : null;
}
/// Closes a draft once; returns false if it was no longer pending (so two admins cannot both act on it).
export async function closeDraft(orgId: string, id: number, status: "approved" | "rejected" | "withdrawn", by: string, note = ""): Promise<boolean> {
  await ensurePolicySchema();
  const r = (await sql`UPDATE tapcard_news_drafts SET status = ${status}, decided_by = ${by}, decided_at = now(), note = ${note} WHERE org_id = ${orgId} AND id = ${id} AND status = 'pending' RETURNING id`) as unknown[];
  return r.length > 0;
}

export async function reopenDraft(orgId: string, id: number): Promise<void> {
  await ensurePolicySchema();
  await sql`UPDATE tapcard_news_drafts SET status = 'pending', decided_by = '', decided_at = NULL WHERE org_id = ${orgId} AND id = ${id}`;
}
export async function seniorCount(orgId: string): Promise<number> {
  await ensurePolicySchema();
  return Number(((await sql`SELECT COUNT(*)::int AS n FROM tapcard_biz_admins WHERE org_id = ${orgId} AND role <> 'manager' AND senior`) as { n: number }[])[0]?.n ?? 0);
}
