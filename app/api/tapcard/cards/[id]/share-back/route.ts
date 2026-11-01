import { after, NextRequest, NextResponse } from "next/server";
import { addWebShareBack, getCard } from "@/lib/tapcardDb";
import { pushToOwner } from "@/lib/tapcardPush";
import { recordFunnel } from "@/lib/tapcardFunnel";

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  title?: string;
  company?: string;
  website?: string;
  hp?: string; // honeypot: real people leave it empty
}

// "Share your details" on the public card page, for someone who scanned or opened the card with no app and no
// personal link. No credential: anyone can leave details, so it's capped per card per hour, needs a name plus a
// phone or email, and drops bots that fill the hidden field. The owner's apps list these as pending cards.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (body.hp) return NextResponse.json({ ok: true }); // pretend success to bots

  const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const name = clip(body.name, 200);
  const phone = clip(body.phone, 60);
  const email = clip(body.email, 200);
  if (!name) return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  if (!phone && !email) return NextResponse.json({ error: "Add a phone number or an email" }, { status: 400 });
  if (phone && phone.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "That phone number looks too short" }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That email doesn't look right" }, { status: 400 });

  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (card.accept_share_back === false) return NextResponse.json({ error: "This card isn't taking details" }, { status: 403 });
  const ok = await addWebShareBack(id, {
    name, phone, email,
    title: clip(body.title, 200),
    company: clip(body.company, 200),
    website: clip(body.website, 300),
  });
  if (!ok) return NextResponse.json({ error: "Too many people sharing right now, try again later" }, { status: 429 });
  after(async () => {
    await recordFunnel("web_shareback", "other", "").catch(() => {});
    await pushToOwner(id, card.grouping_id, { title: "New contact", body: `${name} shared their details with you` });
  });
  return NextResponse.json({ ok: true });
}
