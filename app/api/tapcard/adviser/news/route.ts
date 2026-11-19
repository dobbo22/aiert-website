import { NextResponse } from "next/server";
import { approvedLink, requireAdviser } from "@/lib/tapcardAdvisers";
import { listedSummary } from "@/lib/tapcardListedAdmin";
import { runNewsAction } from "@/lib/tapcardNewsActions";
import { getOrg, isOrgActive } from "@/lib/tapcardBiz";
import { adviserCoverActive } from "@/lib/tapcardAdviserBilling";

// What an adviser may do for a company that approved it: write headlines, manage groups, and (only when the company allowed it and the
// adviser's staff member is senior) post or approve regulatory news. Everything is checked against the approved link on every call.
const ALLOWED = new Set(["news", "approveNews", "rejectNews", "withdrawNews", "addGroup", "removeGroup"]);

export async function POST(req: Request) {
  const me = await requireAdviser();
  if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orgId = String(body?.orgId ?? "");
  const link = await approvedLink(me.adviserId, orgId);
  if (!link) return NextResponse.json({ error: "This company hasn't approved you." }, { status: 403 });
  if (!body || !ALLOWED.has(String(body.action))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const org = await getOrg(orgId);
  if (!org || (!isOrgActive(org) && !(await adviserCoverActive(orgId)))) return NextResponse.json({ error: "The company's billing isn't active, so headlines are paused." }, { status: 402 });
  const s = await listedSummary(orgId);
  const card = s.cards.find((c) => c.id === s.primaryCardId) ?? s.cards[0];
  if (!card) return NextResponse.json({ error: "The company has no card yet." }, { status: 404 });
  // The company card is always the target: an adviser can't name another card.
  const r = await runNewsAction({ orgId, email: me.email, adviser: { id: me.adviserId, name: me.adviserName, senior: me.senior, canRegulatory: link.canRegulatory } }, card.id, { ...body, cardId: card.id });
  return NextResponse.json(r.json, { status: r.status });
}
