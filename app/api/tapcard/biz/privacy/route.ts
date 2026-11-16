import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { orgIsListed, listedSummary } from "@/lib/tapcardListedAdmin";
import { getPrivacyUrl, setPrivacyUrl } from "@/lib/tapcardShare";

// A listed company's own privacy notice link (admins only). Shown in the app beside the name and email a follower shares with the company.
async function gate() {
  const session = await requireBizSession();
  if (!session) return { error: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  if (!(await orgIsListed(session.orgId))) return { error: NextResponse.json({ error: "This is for listed companies." }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const g = await gate();
  if (g.error) return g.error;
  const s = await listedSummary(g.session!.orgId);
  return NextResponse.json({ url: s.primaryCardId ? await getPrivacyUrl(s.primaryCardId) : "" });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if (g.error) return g.error;
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const ok = await setPrivacyUrl(g.session!.orgId, typeof body?.url === "string" ? body.url : "");
  if (!ok) return NextResponse.json({ error: "Please give a full web address starting with https://" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
