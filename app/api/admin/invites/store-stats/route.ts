import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isAdminRequest } from "@/lib/adminRequest";
import { ensureInviteSchema } from "@/lib/tapcardInvites";

// Installs per campaign token, typed in from App Store Connect (Analytics →
// Acquisition → Campaigns) and Play Console (Acquisition reports) — neither
// store offers a simple API for this, so the Track tab compares clicks
// against whatever was last entered here.
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token = String(body?.campaignToken ?? "").slice(0, 40);
  const store = body?.store === "play" ? "play" : body?.store === "appstore" ? "appstore" : null;
  const installs = Number(body?.installs);
  if (!token || !store || !Number.isInteger(installs) || installs < 0) {
    return NextResponse.json({ error: "campaignToken, store and installs required" }, { status: 400 });
  }

  await ensureInviteSchema();
  await sql`
    INSERT INTO tapcard_invite_store_stats (campaign_token, store, installs)
    VALUES (${token}, ${store}, ${installs})
    ON CONFLICT (campaign_token, store) DO UPDATE SET installs = EXCLUDED.installs, updated_at = now()
  `;
  return NextResponse.json({ ok: true });
}
