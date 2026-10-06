import { NextRequest, NextResponse } from "next/server";
import { getOrg, LOCKABLE_FIELDS, updateOrgTemplate } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";

interface Body {
  name?: string;
  logoURL?: string | null;
  website?: string;
  brandColor?: string;
  linkedInURL?: string;
  twitterURL?: string;
  instagramURL?: string;
  facebookURL?: string;
  tiktokURL?: string;
  whatsAppURL?: string;
  lockedFields?: string[];
  allowsPersonalCards?: boolean;
}

export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json()) as Body;
  const lockedFields = (body.lockedFields ?? []).filter((f): f is (typeof LOCKABLE_FIELDS)[number] =>
    (LOCKABLE_FIELDS as readonly string[]).includes(f)
  );

  await updateOrgTemplate(org.id, {
    name: (body.name ?? "").trim().slice(0, 200),
    logo_url: body.logoURL ?? null,
    website: (body.website ?? "").trim().slice(0, 300),
    brand_color: (body.brandColor ?? "").trim().slice(0, 20),
    linkedin_url: (body.linkedInURL ?? "").trim().slice(0, 300),
    twitter_url: (body.twitterURL ?? "").trim().slice(0, 300),
    instagram_url: (body.instagramURL ?? "").trim().slice(0, 300),
    facebook_url: (body.facebookURL ?? "").trim().slice(0, 300),
    tiktok_url: (body.tiktokURL ?? "").trim().slice(0, 300),
    whatsapp_url: (body.whatsAppURL ?? "").trim().slice(0, 300),
    locked_fields: lockedFields,
    allows_personal_cards: body.allowsPersonalCards !== false,
  });

  return NextResponse.json({ ok: true });
}
