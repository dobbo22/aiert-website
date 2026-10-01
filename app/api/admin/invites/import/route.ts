import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { dedupeKey, ensureInviteSchema, normaliseFacebookUrl, normaliseLinkedinUrl } from "@/lib/tapcardInvites";
import type { ImportedContact } from "@/lib/vcardImport";

const MAX_PER_REQUEST = 1000;

// Upserts contacts parsed client-side from an iCloud vCard export or a
// LinkedIn Connections.csv. Matching is by email, else the WhatsApp-
// normalised phone number, else the LinkedIn / Facebook profile, so
// re-importing refreshes details without duplicating anyone or clearing
// their "do not contact" flag. Blank fields never overwrite known ones.
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
    const linkedin = normaliseLinkedinUrl(String(c?.linkedin ?? ""));
    const facebook = normaliseFacebookUrl(String(c?.facebook ?? ""));
    const key = dedupeKey(email, phone, linkedin, facebook);
    if (!name || !key) continue;
    byKey.set(key, {
      name,
      firstName: String(c?.firstName ?? "").trim().slice(0, 100),
      email,
      phone,
      company: String(c?.company ?? "").trim().slice(0, 200),
      linkedin,
      facebook,
    });
  }
  if (byKey.size === 0) return NextResponse.json({ imported: 0 });

  await ensureInviteSchema();

  // LinkedIn connections usually come without an email, so first attach
  // them to the contact already holding that profile, or else to the one
  // (and only one) existing contact with the same name.
  const profileOnly = [...byKey.entries()].filter(([key]) => key.startsWith("l:"));
  let attached = 0;
  if (profileOnly.length) {
    const matched = (await sql`
      WITH u AS (
        SELECT * FROM unnest(${profileOnly.map(([, r]) => r.name)}::text[], ${profileOnly.map(([, r]) => r.linkedin)}::text[])
          AS u(name, url)
      ),
      m AS (
        SELECT DISTINCT ON (u.url) u.url, c.id
        FROM u JOIN tapcard_invite_contacts c
          ON c.linkedin_url = u.url
          OR (c.linkedin_url = '' AND lower(c.name) = lower(u.name)
              AND (SELECT COUNT(*) FROM tapcard_invite_contacts x WHERE lower(x.name) = lower(u.name)) = 1)
        ORDER BY u.url, (c.linkedin_url = u.url) DESC
      )
      UPDATE tapcard_invite_contacts c SET linkedin_url = m.url FROM m WHERE c.id = m.id
      RETURNING m.url
    `) as { url: string }[];
    for (const { url } of matched) byKey.delete(`l:${url}`);
    attached = matched.length;
    if (byKey.size === 0) return NextResponse.json({ imported: attached });
  }

  const keys = [...byKey.keys()];
  const rows = [...byKey.values()];
  await sql`
    INSERT INTO tapcard_invite_contacts (dedupe_key, name, first_name, email, phone, company, linkedin_url, facebook_url)
    SELECT * FROM unnest(
      ${keys}::text[],
      ${rows.map((r) => r.name)}::text[],
      ${rows.map((r) => r.firstName)}::text[],
      ${rows.map((r) => r.email)}::text[],
      ${rows.map((r) => r.phone)}::text[],
      ${rows.map((r) => r.company)}::text[],
      ${rows.map((r) => r.linkedin ?? "")}::text[],
      ${rows.map((r) => r.facebook ?? "")}::text[]
    )
    ON CONFLICT (dedupe_key) DO UPDATE SET
      name = EXCLUDED.name,
      first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), tapcard_invite_contacts.first_name),
      email = CASE WHEN tapcard_invite_contacts.email_edited THEN tapcard_invite_contacts.email
                   ELSE COALESCE(NULLIF(EXCLUDED.email, ''), tapcard_invite_contacts.email) END,
      phone = CASE WHEN tapcard_invite_contacts.phone_edited THEN tapcard_invite_contacts.phone
                   ELSE COALESCE(NULLIF(EXCLUDED.phone, ''), tapcard_invite_contacts.phone) END,
      company = COALESCE(NULLIF(EXCLUDED.company, ''), tapcard_invite_contacts.company),
      linkedin_url = COALESCE(NULLIF(EXCLUDED.linkedin_url, ''), tapcard_invite_contacts.linkedin_url),
      facebook_url = COALESCE(NULLIF(EXCLUDED.facebook_url, ''), tapcard_invite_contacts.facebook_url)
  `;
  return NextResponse.json({ imported: byKey.size + attached });
}
