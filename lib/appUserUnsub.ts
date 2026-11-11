// Opt-out for the app-user emails ("finish your TapCard"). The link carries the address and a signature (see appUserUnsubToken),
// so there is nothing to look up and nobody can unsubscribe someone else's address by guessing. Opt-outs live in their own
// table, which the campaign checks before every send, so a "stop" is honoured by every later campaign too.
import sql from "@/lib/db";
export { unsubToken, emailFromUnsubToken, unsubPageUrl, unsubPostUrl } from "@/lib/appUserUnsubToken";

let ready: Promise<unknown> | null = null;
export function ensureUnsubTable() {
  ready ??= sql`CREATE TABLE IF NOT EXISTS app_user_unsubscribed (
    email text PRIMARY KEY,
    unsubscribed_at timestamptz NOT NULL DEFAULT now(),
    source text NOT NULL DEFAULT 'link'
  )`;
  return ready;
}

export async function recordAppUserUnsub(email: string, source = "link"): Promise<void> {
  await ensureUnsubTable();
  await sql`INSERT INTO app_user_unsubscribed (email, source) VALUES (${email.trim().toLowerCase()}, ${source}) ON CONFLICT (email) DO NOTHING`;
}

export async function unsubscribedEmails(): Promise<Set<string>> {
  await ensureUnsubTable();
  const rows = (await sql`SELECT email FROM app_user_unsubscribed`) as { email: string }[];
  return new Set(rows.map((r) => r.email.toLowerCase()));
}
