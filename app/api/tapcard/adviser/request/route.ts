import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { requestLink, requireAdviser } from "@/lib/tapcardAdvisers";
import { getOrg } from "@/lib/tapcardBiz";
import { ensurePolicySchema, audit } from "@/lib/tapcardNewsPolicy";
import { sendAdviserRequestEmail } from "@/lib/tapcardBizEmail";
import { recordAgreementEvent } from "@/lib/tapcardAdviserBilling";

// An adviser asks a company to let it manage headlines. This only records the request and emails the company's senior admins;
// the adviser gets no access until one of them approves it from their own signed-in admin.
export async function POST(req: Request) {
  const me = await requireAdviser();
  if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { orgId?: string; capM?: number; covers?: boolean } | null;
  const org = body?.orgId ? await getOrg(String(body.orgId)) : null;
  if (!org) return NextResponse.json({ error: "Choose a company from the list." }, { status: 404 });
  const capM = Number(body?.capM);
  if (body?.covers === true && !(capM > 0)) return NextResponse.json({ error: "To cover a company, state its market cap in £ millions. It sets the monthly price." }, { status: 400 });
  const r = await requestLink(me.adviserId, org.id, me.email, { capM, covers: body?.covers === true });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  if (r.created) {
    await ensurePolicySchema();
    const seniors = (await sql`SELECT email FROM tapcard_biz_admins WHERE org_id = ${org.id} AND role <> 'manager' AND senior`) as { email: string }[];
    for (const s of seniors) await sendAdviserRequestEmail(s.email, org.name, me.adviserName, me.email, body?.covers === true, "https://tapcard.aiert.co.uk/business/admin/news?tab=people#advisers").catch((e) => console.error("adviser request email failed:", e));
    const card = ((await sql`SELECT id FROM tapcard_cards WHERE org_id = ${org.id} ORDER BY created_at LIMIT 1`) as { id: string }[])[0];
    await audit({ orgId: org.id, cardId: card?.id ?? "", kind: "general", actor: `${me.email} (${me.adviserName})`, action: "adviser-requested" });
    await recordAgreementEvent(r.linkId, "adviser-requested", `${me.email} (${me.adviserName})`, { offersToPay: body?.covers === true, statedMarketCapM: capM > 0 ? capM : null });
  }
  return NextResponse.json({ ok: true, created: r.created });
}
