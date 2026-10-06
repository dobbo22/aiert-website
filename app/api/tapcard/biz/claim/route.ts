import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createCard, getCard, publicCardJSON } from "@/lib/tapcardDb";
import { hashSecret } from "@/lib/tapcardAuth";
import { attachCardToOrg, countOrgCards, getOrg, orgCanProvision, spendInvite } from "@/lib/tapcardBiz";
import { verifyInvite } from "@/lib/tapcardBizInvite";

// The app calls this once, right after the employee taps their invite link
// (tapcard.aiert.co.uk/business/claim#<token> — the token arrives in the
// body, never the URL, so it stays out of request logs). Checks the
// signature, billing and seats, spends the invite, then builds a normal
// tapcard_cards row from the org template with a fresh edit token — the
// same mechanism every other card uses (lib/tapcardAuth.ts).
export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
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
    },
    editToken,
  });
}
