// A complimentary TapCard Promote for a card: registered charities, small societies, early businesses. It is not a store subscription,
// so it needs no App Store or Google Play purchase; the card can post offers and news while the grant lasts. A real subscription or a
// company's TapCard for Business works alongside it (lib/tapcardPromote.ts checks all three).
import sql from "@/lib/db";

let ready: Promise<unknown> | null = null;
function ensureSchema(): Promise<unknown> {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS tapcard_promote_grants (
        card_id TEXT PRIMARY KEY,
        until TIMESTAMPTZ NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        charity_number TEXT NOT NULL DEFAULT '',
        granted_by TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => sql`
        CREATE TABLE IF NOT EXISTS tapcard_grant_requests (
          id BIGSERIAL PRIMARY KEY,
          card_id TEXT NOT NULL,
          email TEXT NOT NULL,
          group_name TEXT NOT NULL DEFAULT '',
          charity_number TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending',
          note TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

export interface Grant { card_id: string; until: string; reason: string; charity_number: string; granted_by: string; created_at: string }

export async function activeGrant(cardId: string): Promise<{ until: string } | null> {
  await ensureSchema();
  const r = (await sql`SELECT until FROM tapcard_promote_grants WHERE card_id = ${cardId} AND until > now()`) as { until: string }[];
  return r[0] ? { until: new Date(r[0].until).toISOString() } : null;
}

/// Grants (or extends from now) a complimentary Promote. Months 1 to 36.
export async function grantPromote(cardId: string, months: number, reason: string, by: string, charityNumber = ""): Promise<{ until: string }> {
  await ensureSchema();
  const m = Math.min(Math.max(Math.round(months) || 12, 1), 36);
  const r = (await sql`
    INSERT INTO tapcard_promote_grants (card_id, until, reason, charity_number, granted_by)
    VALUES (${cardId}, now() + (${m} * interval '1 month'), ${reason.slice(0, 200)}, ${charityNumber.slice(0, 12)}, ${by.slice(0, 80)})
    ON CONFLICT (card_id) DO UPDATE SET until = GREATEST(tapcard_promote_grants.until, now()) + (${m} * interval '1 month'),
      reason = EXCLUDED.reason, charity_number = EXCLUDED.charity_number, granted_by = EXCLUDED.granted_by
    RETURNING until
  `) as { until: string }[];
  return { until: new Date(r[0].until).toISOString() };
}

export async function revokeGrant(cardId: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM tapcard_promote_grants WHERE card_id = ${cardId}`;
}

export async function listGrants(): Promise<Grant[]> {
  await ensureSchema();
  return (await sql`SELECT card_id, until, reason, charity_number, granted_by, created_at FROM tapcard_promote_grants ORDER BY created_at DESC LIMIT 300`) as Grant[];
}

export interface GrantRequest { id: number; card_id: string; email: string; group_name: string; charity_number: string; status: string; note: string; created_at: string }

export async function addRequest(cardId: string, email: string, groupName: string, charityNumber: string, status: string, note: string): Promise<number> {
  await ensureSchema();
  const r = (await sql`
    INSERT INTO tapcard_grant_requests (card_id, email, group_name, charity_number, status, note)
    VALUES (${cardId}, ${email.slice(0, 200)}, ${groupName.slice(0, 120)}, ${charityNumber.slice(0, 12)}, ${status}, ${note.slice(0, 300)}) RETURNING id
  `) as { id: number }[];
  return Number(r[0].id);
}

export async function recentRequestsFrom(email: string, cardId: string): Promise<number> {
  await ensureSchema();
  const r = (await sql`SELECT COUNT(*)::int AS n FROM tapcard_grant_requests WHERE (email = ${email} OR card_id = ${cardId}) AND created_at > now() - interval '24 hours'`) as { n: number }[];
  return Number(r[0]?.n ?? 0);
}

export async function listRequests(): Promise<GrantRequest[]> {
  await ensureSchema();
  const rows = (await sql`SELECT id, card_id, email, group_name, charity_number, status, note, created_at FROM tapcard_grant_requests ORDER BY (status = 'pending') DESC, id DESC LIMIT 200`) as GrantRequest[];
  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}

export async function setRequestStatus(id: number, status: "granted" | "declined", note = ""): Promise<GrantRequest | null> {
  await ensureSchema();
  const r = (await sql`UPDATE tapcard_grant_requests SET status = ${status}, note = ${note.slice(0, 300)} WHERE id = ${id} RETURNING id, card_id, email, group_name, charity_number, status, note, created_at`) as GrantRequest[];
  return r[0] ? { ...r[0], id: Number(r[0].id) } : null;
}
