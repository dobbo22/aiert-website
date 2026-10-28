import { NextRequest, NextResponse, after } from "next/server";
import { getOrg, orgCanProvision, setCardOverrides } from "@/lib/tapcardBiz";
import { getCard } from "@/lib/tapcardDb";
import { refreshGoogleWalletPass } from "@/lib/googleWallet";
import { pushToFollowers } from "@/lib/tapcardPush";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { sendBizShopLinksEmail } from "@/lib/tapcardBizEmail";
import { createLocation, deleteLocation, getLocation, listLocations, updateLocation, updateLocationDetails, type BizLocation } from "@/lib/tapcardBizLocations";
import { findSiteLinks, tidyAddress } from "@/lib/siteLinks";
import { shopCardLinks } from "@/lib/tapcardBizLocations";
import { inviteLink, signInvite } from "@/lib/tapcardBizInvite";
import { rateLimited } from "@/lib/rateLimit";
import { parseStoredLinks, type CardLink } from "@/lib/tapcardLinks";

// Locations prepared on the web (see lib/tapcardBizLocations.ts). GET lists them; POST adds one from a business the admin picked
// (the card is built as the apps do: address, phone, hours, links from its website), or, with `invite`, signs a claim link for a
// manager; DELETE removes one that has not been claimed.
export async function GET() {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const locations = await listLocations(session.orgId);
  return NextResponse.json({ locations: locations.map(shape) });
}

/// What the web preview needs for one prepared location.
function shape(l: BizLocation) {
  return { id: l.id, name: l.name, address: l.address, phone: l.phone, email: l.email, website: l.website, links: parseStoredLinks(l.links), claimed: !!l.claimed_card_id, cardId: l.claimed_card_id };
}

// Edit a prepared location's name, address, phone and email before its manager claims it.
export async function PATCH(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { id?: string; name?: string; address?: string; phone?: string; email?: string } | null;
  if (!b?.id || !String(b.name ?? "").trim()) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  // A shop whose manager has made the card: the card itself is changed, so customers see it at once and the phone's older copy cannot put it back.
  const loc = await getLocation(b.id);
  if (loc && loc.org_id === session.orgId && loc.claimed_card_id) {
    const patch = { name: String(b.name).trim(), address: String(b.address ?? "").trim(), phone: String(b.phone ?? "").trim(), email: String(b.email ?? "").trim() };
    const changed = await setCardOverrides(session.orgId, loc.claimed_card_id, patch);
    if (!changed) return NextResponse.json({ ok: false }, { status: 404 });
    await updateLocationDetails(session.orgId, loc.id, patch);
    const cardId = loc.claimed_card_id;
    after(async () => {
      const card = await getCard(cardId);
      if (!card) return;
      await refreshGoogleWalletPass(card, `https://tapcard.aiert.co.uk/s/${card.id}`).catch(() => {});
      if (changed.before.address !== changed.after.address) {
        await pushToFollowers(card.id, "changes", { title: card.company || card.name, body: "Opening hours, menu or address updated", ref: `admin-${Date.now()}` }).catch(() => {});
      }
    });
    return NextResponse.json({ ok: true, card: true });
  }
  const ok = await updateLocation(session.orgId, b.id, { name: String(b.name).trim(), address: String(b.address ?? "").trim(), phone: String(b.phone ?? "").trim(), email: String(b.email ?? "").trim() });
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!orgCanProvision(org)) return NextResponse.json({ error: "Billing isn't active, so locations can't be added right now." }, { status: 402 });
  if (rateLimited(req, "biz-locations", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as {
    emailLinks?: boolean;
    invite?: { locationId?: string; name?: string; email?: string };
    hit?: { name?: string; address?: string; phone?: string; website?: string; hours?: string };
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // "Email me the links": every waiting shop's card link, to this admin's own address.
  if (body.emailLinks) {
    if (session.support) return NextResponse.json({ error: "support access cannot send these" }, { status: 403 });
    const waiting = (await listLocations(org.id)).filter((l) => !l.claimed_card_id);
    if (!waiting.length) return NextResponse.json({ error: "Every shop already has its card." }, { status: 409 });
    const links = await shopCardLinks(org, waiting.map((l) => l.id), session.email);
    await sendBizShopLinksEmail(session.email, org.name, links);
    return NextResponse.json({ ok: true, sent: links.length, to: session.email });
  }

  if (body.invite) {
    const loc = body.invite.locationId ? await getLocation(body.invite.locationId) : null;
    if (!loc || loc.org_id !== org.id) return NextResponse.json({ error: "Location not found" }, { status: 404 });
    if (loc.claimed_card_id) return NextResponse.json({ error: "This location already has its card." }, { status: 409 });
    const person = { name: String(body.invite.name ?? "").trim().slice(0, 200), email: String(body.invite.email ?? "").trim().slice(0, 200), title: "" };
    return NextResponse.json({ link: inviteLink(signInvite(org, person, Date.now(), loc.id)) });
  }

  const hit = body.hit;
  const name = String(hit?.name ?? "").trim();
  if (!hit || !name) return NextResponse.json({ error: "Pick a business first." }, { status: 400 });
  // One location per shop in the plan (a trial is one card).
  const have = (await listLocations(org.id)).length;
  const allowed = org.seat_band === "locations" ? Math.max(org.locations, 1) : 1;
  if (have >= allowed) return NextResponse.json({ error: `Your plan has ${allowed} location${allowed === 1 ? "" : "s"}, and ${have === 1 ? "it is" : "they are"} already set up.` }, { status: 409 });

  const website = String(hit.website ?? "").trim().slice(0, 200);
  const address = tidyAddress(String(hit.address ?? "")).slice(0, 300);
  const site = website ? await findSiteLinks(website, address, name).catch(() => null) : null;
  const links: CardLink[] = [...(site?.links ?? [])];
  // Google's opening hours when the site has none of its own.
  if (hit.hours && !links.some((l) => l.kind === "hours")) links.push({ kind: "hours", label: "Opening hours", value: String(hit.hours).slice(0, 300) });
  const loc = await createLocation(org.id, {
    name, address: address || site?.details.address || "", phone: String(hit.phone ?? site?.details.phone ?? "").slice(0, 40),
    email: site?.details.email ?? "", website: org.website || website, links,
  });
  return NextResponse.json({ location: shape(loc) });
}

export async function DELETE(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  // A location whose card has been removed (Employees tab or the Remove card button) can be cleared away too.
  const loc = await getLocation(id);
  const cardGone = !!loc?.claimed_card_id && !(await getCard(loc.claimed_card_id));
  const ok = await deleteLocation(session.orgId, id, cardGone);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
