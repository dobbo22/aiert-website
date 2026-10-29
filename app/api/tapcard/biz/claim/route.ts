import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createCard, getCard, publicCardJSON, replaceEditToken } from "@/lib/tapcardDb";
import { canEdit, hashSecret, readEditToken } from "@/lib/tapcardAuth";
import { isPersonalCard } from "@/lib/tapcardPassStyle";
import { attachCardToOrg, cardOrgId, countOrgCards, getOrg, orgCanProvision, spendInvite, wasRemovedByCompany } from "@/lib/tapcardBiz";
import { verifyInvite } from "@/lib/tapcardBizInvite";
import { getLocation, markLocationClaimed, syncShopPosting } from "@/lib/tapcardBizLocations";
import { setCardStaffLocation } from "@/lib/tapcardBiz";
import sql from "@/lib/db";

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
  // Hand-over: an admin made this shop's card on their own phone; whoever opens the link takes it over (no new card, so no seat is used).
  // The card keeps its link, QR code, followers and offers; the old phone's edit access ends.
  if (invite.m) {
    const shop = invite.l ? await getLocation(invite.l) : null;
    const card = shop && shop.org_id === org.id && shop.claimed_card_id === invite.m ? await getCard(invite.m) : null;
    if (!card) return NextResponse.json({ error: "this shop's card has changed since the link was made; ask your admin for a new one" }, { status: 409 });
    if (!(await spendInvite(invite.j, org.id))) return NextResponse.json({ error: "this invite link was already used" }, { status: 409 });
    const newToken = crypto.randomBytes(32).toString("base64url").replace(/=/g, "");
    await replaceEditToken(card.id, hashSecret(newToken));
    if (invite.l) await syncShopPosting(org.id, [invite.l]);
    const handed = (await getCard(card.id)) ?? card;
    return NextResponse.json({
      card: { ...publicCardJSON(handed), orgID: org.id, orgLockedFields: org.locked_fields, orgPolicyVersion: org.policy_version, orgLogoURL: org.logo_url },
      editToken: newToken,
    });
  }
  // A shop's card is made once. A second link for the same shop (an admin pressed Create link twice, or sent it to two people) must not
  // make a stray duplicate card; the admin hands the existing card over instead. Checked before the invite is spent.
  if (invite.l) {
    const shop = await getLocation(invite.l);
    if (shop && shop.org_id === org.id && shop.claimed_card_id) {
      return NextResponse.json({ error: "This shop's card has already been made. Look in My Cards, or ask your admin for a hand-over link if you are taking it over." }, { status: 409 });
    }
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
    // Opened from a shop's link: the person's own card becomes that shop's card.
    const shopFor = invite.l ? await getLocation(invite.l) : null;
    if (shopFor && shopFor.org_id === org.id && !shopFor.claimed_card_id) { await markLocationClaimed(shopFor.id, existing.id); await syncShopPosting(org.id, [shopFor.id]); }
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

  // A staff card for a shop carries the shop's address and phone, so staff can share where and how to reach it.
  const staffShop = invite.s ? await getLocation(invite.s) : null;
  const staffOf = staffShop && staffShop.org_id === org.id ? staffShop : null;

  // A location the admin prepared on the web: the card is built already, with its address, phone and links, as a shop / location.
  const loc = invite.l ? await getLocation(invite.l) : null;
  const location = loc && loc.org_id === org.id && !loc.claimed_card_id ? loc : null;

  const editToken = crypto.randomBytes(32).toString("base64url").replace(/=/g, "");
  const cardId = await createCard(
    {
      label: org.name || "Work",
      grouping_id: "",
      name: location ? location.name : invite.n,
      title: location ? "" : invite.t,
      company: org.name,
      phone: location?.phone ?? staffOf?.phone ?? "",
      email: location ? location.email : invite.e,
      website: org.website,
      address: location?.address ?? staffOf?.address ?? "",
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
      ...(location ? { links: location.links, card_kind: "business" } : {}),
    },
    hashSecret(editToken),
    hashSecret(`biz-claim:${org.id}`)
  );
  await attachCardToOrg(cardId, org.id, org.locked_fields);
  if (!location && invite.s) {
    // A staff card made from a shop manager's invite belongs to that shop (only if the shop is really this company's).
    const shop = await getLocation(invite.s);
    if (shop && shop.org_id === org.id) await setCardStaffLocation(cardId, shop.id);
  }
  if (location) {
    await markLocationClaimed(location.id, cardId);
    // The shop's manager may post its offers and news from their phone (the admin can too, from the web).
    await syncShopPosting(org.id, [location.id]);
    // Offers and news are for admins to post (from the web). A manager's phone cannot post for its shop unless an admin ticks it on the
    // Employees tab, so nothing is ticked here.
  }

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
