import { NextRequest, NextResponse } from "next/server";
import { buildPrebuiltCard, hashIp, recentCounts, storePrebuilt } from "@/lib/tapcardPrebuilt";
import { sendPrebuiltEmail } from "@/lib/tapcardPrebuiltEmail";

// POST { name, website?, email, consent: true, company? (honeypot) } -> builds the card from the website, emails the
// link, returns the card for the on-page demo. Public endpoint: rate limited per connection and per email.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  // Honeypot: real visitors never fill this in.
  if (typeof body.company === "string" && body.company.trim()) return NextResponse.json({ ok: true });
  const name = String(body.name ?? "").trim().slice(0, 80);
  const website = String(body.website ?? "").trim().slice(0, 200);
  const email = String(body.email ?? "").trim().slice(0, 120);
  if (name.length < 2) return NextResponse.json({ error: "name" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "email" }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "consent" }, { status: 400 });
  if (website && !/^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(website)) return NextResponse.json({ error: "website" }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = hashIp(ip);
  const { byIp, byEmail } = await recentCounts(ipHash, email);
  if (byIp >= 5 || byEmail >= 3) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const card = await buildPrebuiltCard(name, website);
  const token = await storePrebuilt(email, name, website, card, ipHash);
  const link = `https://tapcard.aiert.co.uk/start/${token}`;
  let emailed = true;
  try { await sendPrebuiltEmail(email, name, link); } catch (e) { emailed = false; console.error("prebuilt email failed", e); }
  return NextResponse.json({ ok: true, emailed, card, link });
}
