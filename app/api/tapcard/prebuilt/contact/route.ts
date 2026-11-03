import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { rateLimited } from "@/lib/rateLimit";
import { sanitizeLinks } from "@/lib/tapcardLinks";
import { contactCardsMadeToday, storePrebuilt, type PrebuiltCard } from "@/lib/tapcardPrebuilt";

// POST from the apps' Send card on a contact: makes the contact a ready-to-claim TapCard from the details the sender holds, so the
// message can carry "here is your own TapCard" next to the sender's. Only a card owner can do this (their edit key), 30 a day per
// card. The card is kept under a secret token for 30 days (rows go after 60), which the contact opens at /start/<token>.
const ORIGIN = "https://tapcard.aiert.co.uk";
const DAILY_LIMIT = 30;

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const https = (v: unknown) => { const s = str(v, 300); return /^https:\/\/[^\s]+\.[^\s]+$/i.test(s) ? s : ""; };

export async function POST(req: NextRequest) {
  if (rateLimited(req, "prebuilt-contact", 40, 60 * 60_000)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const fromCardId = str(b.fromCardId, 60);
  const sender = fromCardId ? await getCard(fromCardId) : null;
  if (!sender) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(sender, readEditToken(req)))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if ((await contactCardsMadeToday(sender.id)) >= DAILY_LIMIT) return NextResponse.json({ error: "Daily limit reached. Try again tomorrow." }, { status: 429 });

  const name = str(b.name, 120), company = str(b.company, 120);
  const phone = str(b.phone, 40), email = str(b.email, 200).toLowerCase(), website = str(b.website, 200);
  if (!name && !company) return NextResponse.json({ error: "a name or company is required" }, { status: 400 });
  if (!phone && !email && !website) return NextResponse.json({ error: "a phone, email or website is required" }, { status: 400 });
  const kind = b.kind === "business" ? "business" : "person";

  const payload: PrebuiltCard = {
    name: name || company, company, website, address: str(b.address, 300), phone,
    label: "Business", cardKind: kind, title: str(b.title, 120), email,
    links: sanitizeLinks(b.links).slice(0, 10),
    facebookUrl: https(b.facebookUrl), instagramUrl: https(b.instagramUrl), twitterUrl: https(b.twitterUrl),
    linkedInUrl: https(b.linkedInUrl), tiktokUrl: https(b.tiktokUrl), branchCount: 0,
  };
  const token = await storePrebuilt(email, name || company, website, payload, null, "contact", sender.id);
  return NextResponse.json({ token, url: `${ORIGIN}/start/${token}` });
}
