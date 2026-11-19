import { NextResponse } from "next/server";
import { getLink, requireAdviser } from "@/lib/tapcardAdvisers";
import { endCover, recordAgreementEvent } from "@/lib/tapcardAdviserBilling";
import { audit } from "@/lib/tapcardNewsPolicy";

// An adviser stops covering a company. It still pays until the company's 6-month term ends; the company then has a 30-day grace period.
export async function POST(req: Request) {
  const me = await requireAdviser();
  if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!me.senior) return NextResponse.json({ error: "Only senior staff can end cover." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { orgId?: string } | null;
  const links = (await (await import("@/lib/tapcardAdvisers")).linksForAdviser(me.adviserId)).filter((l) => l.orgId === body?.orgId);
  const link = links[0] ? await getLink(links[0].id) : null;
  if (!link) return NextResponse.json({ error: "No such company." }, { status: 404 });
  const r = await endCover(link.id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
  await audit({ orgId: link.orgId, cardId: "", kind: "general", actor: `${me.email} (${me.adviserName})`, action: "adviser-cover-ended", detail: { endsAt: r.endsAt.toISOString(), by: "adviser" } });
  await recordAgreementEvent(link.id, "cover-ended", `${me.email} (${me.adviserName})`, { by: "adviser", endsAt: r.endsAt.toISOString() });
  return NextResponse.json({ ok: true, endsAt: r.endsAt.toISOString() });
}
