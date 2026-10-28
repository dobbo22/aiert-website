import { NextRequest, NextResponse } from "next/server";
import { getOrg, orgCanProvision } from "@/lib/tapcardBiz";
import { requireBizUser } from "@/lib/tapcardBizSession";
import { getLocation } from "@/lib/tapcardBizLocations";
import { inviteLink, signInvite } from "@/lib/tapcardBizInvite";

const MAX_PEOPLE = 1000;

interface Body {
  people?: { name?: string; email?: string; title?: string }[];
  /// The shop these staff belong to. A manager must give one of their own shops; an admin may give any of the company's, or none.
  locationId?: string;
}

// Signs one invite link per person from the admin's own staff file (read
// in their browser — see app/tapcard/business/admin/employees). Stores
// nothing: the details only exist inside the returned links, which the
// admin sends from their own email. See lib/tapcardBizInvite.ts.
export async function POST(req: NextRequest) {
  const session = await requireBizUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!orgCanProvision(org)) {
    return NextResponse.json({ error: "Billing isn't active, so invites can't be created right now." }, { status: 402 });
  }

  const parsedBody = (await req.json().catch(() => null)) as Body | null;
  if (!parsedBody || typeof parsedBody !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const people = parsedBody.people ?? [];
  if (!Array.isArray(people) || people.length === 0 || people.length > MAX_PEOPLE) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_PEOPLE} people.` }, { status: 400 });
  }

  // Which shop the staff belong to: a manager's own shop; an admin's choice (or none).
  let staffLocation: string | undefined;
  const asked = typeof parsedBody.locationId === "string" ? parsedBody.locationId : "";
  if (session.role === "manager") {
    if (!asked || !session.locationIds.includes(asked)) return NextResponse.json({ error: "Choose one of your shops." }, { status: 403 });
  }
  if (asked) {
    const shop = await getLocation(asked);
    if (!shop || shop.org_id !== org.id) return NextResponse.json({ error: "That shop isn't part of this company." }, { status: 400 });
    staffLocation = shop.id;
  }

  const invites = people.map((p) => {
    const person = {
      name: String(p.name ?? "").trim().slice(0, 200),
      email: String(p.email ?? "").trim().slice(0, 200),
      title: String(p.title ?? "").trim().slice(0, 200),
    };
    return { email: person.email, link: inviteLink(signInvite(org, person, Date.now(), undefined, staffLocation)) };
  });
  return NextResponse.json({ invites });
}
