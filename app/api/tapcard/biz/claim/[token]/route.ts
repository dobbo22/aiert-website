import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createCard, getCard, publicCardJSON } from "@/lib/tapcardDb";
import { hashSecret } from "@/lib/tapcardAuth";
import { attachCardToOrg, getEmployeeByClaimToken, getOrg, markClaimed, orgCanProvision } from "@/lib/tapcardBiz";

// The app calls this once, right after the employee taps their claim link
// (see app/api/tapcard/biz/employees/import/route.ts for how the link/email
// gets sent, and the existing app/tapcard/i/[token] Universal Link flow
// this reuses for "install the app, then continue"). Builds a real
// tapcard_cards row pre-filled from the org's template, generates a normal
// edit token (same mechanism every other card uses — lib/tapcardAuth.ts),
// and hands both back so the app can store it exactly like any other card.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: claimToken } = await params;

  const employee = await getEmployeeByClaimToken(claimToken);
  if (!employee) return NextResponse.json({ error: "this invite link has expired or was already used" }, { status: 404 });

  const org = await getOrg(employee.org_id);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!orgCanProvision(org)) {
    return NextResponse.json({ error: "billing isn't active for this account right now" }, { status: 402 });
  }

  const editToken = crypto.randomBytes(32).toString("base64url").replace(/=/g, "");
  const cardId = await createCard(
    {
      label: org.name || "Work",
      grouping_id: "",
      name: employee.name,
      title: employee.title,
      company: org.name,
      phone: "",
      email: employee.email,
      website: org.website,
      address: "",
      linkedin_url: org.linkedin_url,
      twitter_url: org.twitter_url,
      instagram_url: org.instagram_url,
      facebook_url: org.facebook_url,
      facebook_is_page: false,
      tiktok_url: org.tiktok_url,
      whatsapp_url: org.whatsapp_url,
      photo_url: org.logo_url,
      pass_style: "brand",
    },
    hashSecret(editToken),
    hashSecret(`biz-claim:${org.id}`)
  );

  await attachCardToOrg(cardId, org.id, employee.id, org.locked_fields);
  await markClaimed(employee.id, cardId);

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
