import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { dedupeKey, ensureInviteSchema } from "@/lib/tapcardInvites";
import type { ImportedContact } from "@/lib/vcardImport";

const MAX_PER_REQUEST = 1000;

// Upserts contacts parsed client-side from an iCloud vCard export. Matching
// is by email (or, without one, the WhatsApp-normalised phone number), so
// re-importing an updated export refreshes details without duplicating
// anyone or clearing their "do not contact" flag.
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const input = Array.isArray(body?.contacts) ? (body.contacts as ImportedContact[]) : null;
  if (!input) return NextResponse.json({ error: "contacts array required" }, { status: 400 });
  if (input.length > MAX_PER_REQUEST) return NextResponse.json({ error: `At most ${MAX_PER_REQUEST} per request` }, { status: 400 });

  const byKey = new Map<string, ImportedContact>();
  for (const c of input) {
    const name = String(c?.name ?? "").trim().slice(0, 200);
    const email = String(c?.email ?? "").trim().slice(0, 200);
    const phone = String(c?.phone ?? "").trim().slice(0, 50);
    const key = dedupeKey(email, phone);
    if (!name || !key) continue;
    byKey.set(key, {
      name,
      firstName: String(c?.firstName ?? "").trim().slice(0, 100),
      email,
      phone,
      company: String(c?.company ?? "").trim().slice(0, 200),
    });
  }
  if (byKey.size === 0) return NextResponse.json({ imported: 0 });

  await ensureInviteSchema();
  const keys = [...byKey.keys()];
  const rows = [...byKey.values()];
  await sql`
    INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email, phone, company)
    SELECT * FROM unnest(
      ${keys}::text[],
      ${rows.map((r) => r.name)}::text[],
      ${rows.map((r) => r.firstName)}::text[],
      ${rows.map((r) => r.email)}::text[],
      ${rows.map((r) => r.phone)}::text[],
      ${rows.map((r) => r.company)}::text[]
    )
    ON CONFLICT (dedupe_key) DO UPDATE SET
      name = EXCLUDED.name,
      first_name = EXCLUDED.first_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      company = EXCLUDED.company
  `;
  return NextResponse.json({ imported: byKey.size });
}
