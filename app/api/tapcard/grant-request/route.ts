import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { isBusinessLabel } from "@/lib/tapcardLinks";
import { rateLimited } from "@/lib/rateLimit";
import { cleanCharityNumber, lookupCharity, sameSite } from "@/lib/charityCheck";
import { addRequest, grantPromote, recentRequestsFrom } from "@/lib/tapcardGrants";
import { notifyAdminOfRequest, sendGrantedEmail } from "@/lib/tapcardGrantMail";

// A club, society or charity asks for a free TapCard Promote. A registered charity whose Charity Commission website matches the card's
// website is approved straight away; everything else waits for a person (and the admin is emailed). See lib/tapcardGrants.ts.
function cardIdFrom(input: string): string | null {
  const t = input.trim();
  const m = t.match(/\/c\/([A-Za-z0-9_-]{16,40})/) ?? t.match(/^([A-Za-z0-9_-]{16,40})$/);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  if (rateLimited(req, "grant-request", 5, 60 * 60_000)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { card?: unknown; email?: unknown; groupName?: unknown; charityNumber?: unknown } | null;
  const cardId = cardIdFrom(String(body?.card ?? ""));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const groupName = String(body?.groupName ?? "").trim().slice(0, 120);
  const rawNumber = String(body?.charityNumber ?? "").trim();
  if (!cardId) return NextResponse.json({ error: "Paste your card's link (it looks like tapcard.aiert.co.uk/c/...)." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return NextResponse.json({ error: "Enter an email address we can reply to." }, { status: 400 });
  if (groupName.length < 2) return NextResponse.json({ error: "Tell us your group's name." }, { status: 400 });
  const card = await getCard(cardId);
  if (!card || !isBusinessLabel(card.label)) return NextResponse.json({ error: "We couldn't find that card. Check the link." }, { status: 404 });
  if ((await recentRequestsFrom(email, cardId)) >= 3) return NextResponse.json({ error: "We already have your request. We'll be in touch." }, { status: 429 });

  const number = rawNumber ? cleanCharityNumber(rawNumber) : null;
  if (rawNumber && !number) return NextResponse.json({ error: "A charity number is 5 to 8 digits. Leave it blank if your group isn't a registered charity." }, { status: 400 });

  let reason = number ? "" : "no charity number given";
  if (number) {
    const c = await lookupCharity(number);
    if (!c.ok) reason = c.error === "not_configured" ? "charity register check is not switched on" : c.error === "not_found" ? "number not on the England and Wales register" : "register could not be checked";
    else if (!c.registered) reason = `charity ${c.number} is not currently registered`;
    else if (!card.website || !c.web) reason = `no website on ${card.website ? "the register" : "the card"} to match`;
    else if (!sameSite(card.website, c.web)) reason = `card website ${card.website} does not match the register's ${c.web}`;
    else {
      // Registered, and the card is on the charity's own website: approved now.
      const g = await grantPromote(cardId, 12, `Registered charity ${c.name} (${c.number}), checked automatically`, "auto", c.number);
      await addRequest(cardId, email, groupName, c.number, "granted", `auto: ${c.name}`);
      await sendGrantedEmail(email, groupName, g.until).catch(() => {});
      return NextResponse.json({ ok: true, granted: true, until: g.until });
    }
  }
  await addRequest(cardId, email, groupName, number ?? "", "pending", reason);
  await notifyAdminOfRequest({ groupName, email, cardId, charityNumber: number ?? "", reason }).catch(() => {});
  return NextResponse.json({ ok: true, granted: false });
}
