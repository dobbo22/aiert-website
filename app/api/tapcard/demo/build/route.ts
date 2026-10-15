import { NextRequest, NextResponse } from "next/server";
import { applyChoices, buildPrebuiltCard, hashIp, recentCounts, recordDemoContact, storePrebuilt } from "@/lib/tapcardPrebuilt";
import { sendPrebuiltEmail } from "@/lib/tapcardPrebuiltEmail";
import { DEMO_KINDS } from "@/app/tapcard/demo/demoOffers";

// POST { name, website?, email, consent: true, company? (honeypot) } -> builds the card from the website, emails the
// link, returns the card for the on-page demo. Public endpoint: rate limited per connection and per email.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  // Honeypot: real visitors never fill this in.
  if (typeof body.company === "string" && body.company.trim()) return NextResponse.json({ ok: true });
  const name = String(body.name ?? "").trim().slice(0, 80);
  const website = String(body.website ?? "").trim().slice(0, 200);
  const address = String(body.address ?? "").trim().slice(0, 200);
  const kind = DEMO_KINDS.includes(String(body.kind ?? "")) ? String(body.kind) : "";
  const email = String(body.email ?? "").trim().slice(0, 120);
  if (name.length < 2) return NextResponse.json({ error: "name" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "email" }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "consent" }, { status: 400 });
  if (website && !/^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(website)) return NextResponse.json({ error: "website" }, { status: 400 });

  // preview: build and show the card, nothing saved and nothing sent. The send call carries the visitor's choices.
  const preview = body.preview === true;
  const keep = Array.isArray(body.keep) ? body.keep.filter((x): x is string => typeof x === "string").slice(0, 30) : null;
  const extra = (Array.isArray(body.extra) ? body.extra : []).slice(0, 2).map((e) => {
    const r = (e ?? {}) as Record<string, unknown>;
    return { label: String(r.label ?? ""), value: String(r.value ?? "") };
  });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = hashIp(ip);
  const { byIp, byEmail } = await recentCounts(ipHash, email);
  if (byIp >= 5 || byEmail >= 3) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const built = await buildPrebuiltCard(name, website, address);
  const branches = built.branches;
  const card = preview ? built.card : applyChoices(built.card, keep, extra);
  // Several addresses on the site and none chosen yet: ask which is theirs before anything is saved or sent.
  if (branches.length > 1 && !address) return NextResponse.json({ needsBranch: true, branches: branches.slice(0, 12) });
  if (preview) return NextResponse.json({ ok: true, preview: true, card });
  const token = await storePrebuilt(email, name, website, card, ipHash, kind);
  await recordDemoContact(email, name, card.website, card.address).catch((e) => console.error("demo contact failed", e));
  const link = `https://tapcard.aiert.co.uk/start/${token}`;
  let emailed = true;
  try { await sendPrebuiltEmail(email, name, link); } catch (e) { emailed = false; console.error("prebuilt email failed", e); }
  return NextResponse.json({ ok: true, emailed, card, link });
}
