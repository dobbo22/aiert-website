import { NextRequest, NextResponse } from "next/server";
import { countRecentCreates, createCard, getCard, updateCard } from "@/lib/tapcardDb";
import { canEdit, clientIpHash, hashSecret, readEditToken } from "@/lib/tapcardAuth";

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

// No accounts: each card has a secret edit token that only the owner's app
// holds (see lib/tapcardAuth.ts). Creating a card sets it; updating needs it.
const MAX_CREATES_PER_HOUR = 20;

export async function POST(req: NextRequest) {
  const token = readEditToken(req);
  if (!token) return NextResponse.json({ error: "edit token required" }, { status: 401 });

  const body = (await req.json()) as CardBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const fields = sanitize(body);

  if (body.id) {
    const existing = await getCard(body.id);
    if (existing) {
      if (!(await canEdit(existing, token))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      await updateCard(body.id, fields);
      return NextResponse.json({ id: body.id });
    }
    // Falls through to create — an id the iOS app has locally but that no
    // longer exists server-side (e.g. after a "Stop sharing" delete)
    // should re-create rather than 404, so re-sharing just works.
  }

  const ipHash = clientIpHash(req);
  if ((await countRecentCreates(ipHash)) >= MAX_CREATES_PER_HOUR) {
    return NextResponse.json({ error: "too many cards created, try again later" }, { status: 429 });
  }
  const id = await createCard(fields, hashSecret(token), ipHash);
  return NextResponse.json({ id });
}
