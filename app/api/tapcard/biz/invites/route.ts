import { NextRequest, NextResponse } from "next/server";
import { getOrg, orgCanProvision } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { inviteLink, signInvite } from "@/lib/tapcardBizInvite";

const MAX_PEOPLE = 1000;

interface Body {
  people?: { name?: string; email?: string; title?: string }[];
}

// Signs one invite link per person from the admin's own staff file (read
// in their browser — see app/tapcard/business/admin/employees). Stores
// nothing: the details only exist inside the returned links, which the
// admin sends from their own email. See lib/tapcardBizInvite.ts.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!orgCanProvision(org)) {
    return NextResponse.json({ error: "Billing isn't active, so invites can't be created right now." }, { status: 402 });
  }

  const people = ((await req.json()) as Body).people ?? [];
  if (!Array.isArray(people) || people.length === 0 || people.length > MAX_PEOPLE) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_PEOPLE} people.` }, { status: 400 });
  }

  const invites = people.map((p) => {
    const person = {
      name: String(p.name ?? "").trim().slice(0, 200),
      email: String(p.email ?? "").trim().slice(0, 200),
      title: String(p.title ?? "").trim().slice(0, 200),
    };
    return { email: person.email, link: inviteLink(signInvite(org, person)) };
  });
  return NextResponse.json({ invites });
}
