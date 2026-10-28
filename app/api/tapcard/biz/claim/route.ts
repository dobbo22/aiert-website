import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createCard, getCard, publicCardJSON } from "@/lib/tapcardDb";
import { canEdit, hashSecret, readEditToken } from "@/lib/tapcardAuth";
import { isPersonalCard } from "@/lib/tapcardPassStyle";
import { attachCardToOrg, cardOrgId, countOrgCards, getOrg, orgCanProvision, spendInvite, wasRemovedByCompany } from "@/lib/tapcardBiz";
import { verifyInvite } from "@/lib/tapcardBizInvite";

// The app calls this once, right after the employee taps their invite link
// (tapcard.aiert.co.uk/business/claim#<token> — the token arrives in the
// body, never the URL, so it stays out of request logs). Checks the
// signature, billing and seats, spends the invite, then builds a normal
// tapcard_cards row from the org template with a fresh edit token — the
// same mechanism every other card uses (lib/tapcardAuth.ts).
export async function POST(req: NextRequest) {
  const { token, existingCardId } = (await req.json().catch(() => ({}))) as { token?: string; existingCardId?: string };
  const invite = token ? verifyInvite(token) : null;
  if (!invite) {
    return NextResponse.json({ error: "this invite link isn't valid or has expired" }, { status: 404 });
  }

  const org = await getOrg(invite.o);
  if (!org) return NextResponse.json({ error: "this company's TapCard account no longer exists" }, { status: 404 });
  if (!orgCanProvision(org)) {
    return NextResponse.json({ error: "billing isn't active for this account right now" }, { status: 402 });
  }
  // Checked before spending, so a full plan doesn't burn the invite.
  if (org.seat_limit > 0 && (await countOrgCards(org.id)) >= org.seat_limit) {
    return NextResponse.json({ error: "your company has used all its TapCard seats — ask your admin" }, { status: 402 });
  }
  // "Use my existing card": the person's own business card joins the company instead of a new one being made, so its link, QR code,
  // Wallet pass, saves and followers carry on. Needs the card's own edit token, and only a business card that belongs to nobody yet.
  if (existingCardId) {
    const existing = await getCard(existingCardId);
    if (!existing || !(await canEdit(existing, readEditToken(req)))) {
      return NextResponse.json({ error: "that card could not be checked, so it was not moved" }, { status: 403 });
    }
    if (isPersonalCard(existing) || existing.card_kind === "person") {
      return NextResponse.json({ error: "a personal card can't join a company; use a business card" }, { status: 400 });
    }
    if ((await cardOrgId(existing.id)) || (await wasRemovedByCompany(existing.id))) {
      return NextResponse.json({ error: "that card already belongs to a company" }, { status: 409 });
    }
    if (!(await spendInvite(invite.j, org.id))) {
      return NextResponse.json({ error: "this invite link was already used" }, { status: 409 });
    }
    await attachCardToOrg(existing.id, org.id, org.locked_fields);
    const joined = await getCard(existing.id);
    if (!joined) return NextResponse.json({ error: "something went wrong joining your card" }, { status: 500 });
    return NextResponse.json({
      card: { ...publicCardJSON(joined), orgID: org.id, orgLockedFields: org.locked_fields, orgPolicyVersion: org.policy_version, orgLogoURL: org.logo_url },
      // The person's own edit token carries on unchanged.
      editToken: "",
    });
  }
  if (!(await spendInvite(invite.j, org.id))) {
    return NextResponse.json({ error: "this invite link was already used" }, { status: 409 });
  }

  const editToken = crypto.randomBytes(32).toString("base64url").replace(/=/g, "");
  const cardId = await createCard(
    {
      label: org.name || "Work",
      grouping_id: "",
      name: invite.n,
      title: invite.t,
      company: org.name,
      phone: "",
      email: invite.e,
      website: org.website,
      address: "",
      linkedin_url: org.linkedin_url,
      twitter_url: org.twitter_url,
      instagram_url: org.instagram_url,
      facebook_url: org.facebook_url,
      facebook_is_page: false,
      tiktok_url: org.tiktok_url,
      whatsapp_url: org.whatsapp_url,
      // The person adds their own photo in the app; the company logo has
      // its own place on the card (orgLogoUrlForCard).
      photo_url: null,
      pass_style: "brand",
    },
    hashSecret(editToken),
    hashSecret(`biz-claim:${org.id}`)
  );
  await attachCardToOrg(cardId, org.id, org.locked_fields);

  const card = await getCard(cardId);
  if (!card) return NextResponse.json({ error: "something went wrong creating your card" }, { status: 500 });

  return NextResponse.json({
    card: {
      ...publicCardJSON(card),
      orgID: org.id,
      orgLockedFields: org.locked_fields,
      orgPolicyVersion: org.policy_version,
      orgLogoURL: org.logo_url,
    },
    editToken,
  });
}
