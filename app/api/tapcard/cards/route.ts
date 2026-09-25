import { NextRequest, NextResponse } from "next/server";
import { createCard, updateCard } from "@/lib/tapcardDb";

interface CardBody {
  id?: string;
  label?: string;
  groupingID?: string;
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  linkedInURL?: string;
  twitterURL?: string;
  instagramURL?: string;
  facebookURL?: string;
  facebookIsPage?: boolean;
  tiktokURL?: string;
}

// Same rules as the iOS app's SocialProfileLink: a bare handle ("@Aiert")
// becomes a profile URL, a scheme-less URL gets https://. Covers cards
// shared by app builds that didn't normalize before sending.
const SOCIAL_PROFILES = {
  linkedin: { base: "https://www.linkedin.com/in/", domains: ["linkedin.com"] },
  x: { base: "https://x.com/", domains: ["x.com", "twitter.com"] },
  instagram: { base: "https://www.instagram.com/", domains: ["instagram.com"] },
  facebook: { base: "https://www.facebook.com/", domains: ["facebook.com", "fb.com"] },
  tiktok: { base: "https://www.tiktok.com/@", domains: ["tiktok.com"] },
};

function socialUrl(raw: string | undefined, platform: keyof typeof SOCIAL_PROFILES): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const { base, domains } = SOCIAL_PROFILES[platform];
  let url: string;
  if (/^https?:\/\//i.test(value)) url = value;
  else if (value.includes("/") || domains.some((d) => value.toLowerCase().includes(d))) url = `https://${value}`;
  else {
    const handle = value.replace(/^[@\s]+|\s+$/g, "");
    url = handle ? base + handle : "";
  }
  return url.slice(0, 300);
}

function sanitize(body: CardBody) {
  return {
    label: (body.label ?? "").trim().slice(0, 60),
    grouping_id: (body.groupingID ?? "").trim().slice(0, 100),
    name: (body.name ?? "").trim().slice(0, 200),
    title: (body.title ?? "").trim().slice(0, 200),
    company: (body.company ?? "").trim().slice(0, 200),
    phone: (body.phone ?? "").trim().slice(0, 60),
    email: (body.email ?? "").trim().slice(0, 200),
    website: (body.website ?? "").trim().slice(0, 300),
    linkedin_url: socialUrl(body.linkedInURL, "linkedin"),
    twitter_url: socialUrl(body.twitterURL, "x"),
    instagram_url: socialUrl(body.instagramURL, "instagram"),
    facebook_url: socialUrl(body.facebookURL, "facebook"),
    facebook_is_page: body.facebookIsPage === true,
    tiktok_url: socialUrl(body.tiktokURL, "tiktok"),
  };
}

// No auth: the id returned here is an unguessable token the iOS app stores
// locally and treats as its write credential (see lib/tapcardDb.ts). This
// is TapCard's whole security model for MVP — acceptable for a free,
// no-login lead-gen app with no sensitive data beyond what's on a printed
// business card, but not a pattern to copy for anything more sensitive.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as CardBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const fields = sanitize(body);

  if (body.id) {
    const updated = await updateCard(body.id, fields);
    if (updated) return NextResponse.json({ id: body.id });
    // Falls through to create — an id the iOS app has locally but that no
    // longer exists server-side (e.g. after a "Stop sharing" delete)
    // should re-create rather than 404, so re-sharing just works.
  }

  const id = await createCard(fields);
  return NextResponse.json({ id });
}
