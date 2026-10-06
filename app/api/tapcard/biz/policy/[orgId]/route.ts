import { NextResponse } from "next/server";
import { getOrg } from "@/lib/tapcardBiz";

// Polled by the app whenever a locally-cached org card's orgPolicyVersion
// doesn't match what's stored — lets an admin's template/lock-list change
// reach already-claimed cards without the app polling constantly. Public
// (no auth): the org id alone reveals nothing sensitive, same trust model
// as a card's public id elsewhere in TapCard.
export async function GET(_req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const org = await getOrg(orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    policyVersion: org.policy_version,
    allowsPersonalCards: org.allows_personal_cards,
    lockedFields: org.locked_fields,
    template: {
      name: org.name,
      logoURL: org.logo_url,
      website: org.website,
      brandColor: org.brand_color,
      linkedInURL: org.linkedin_url,
      twitterURL: org.twitter_url,
      instagramURL: org.instagram_url,
      facebookURL: org.facebook_url,
      tiktokURL: org.tiktok_url,
      whatsAppURL: org.whatsapp_url,
    },
  });
}
