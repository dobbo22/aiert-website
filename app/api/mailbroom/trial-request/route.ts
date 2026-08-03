import { NextRequest, NextResponse } from "next/server";
import { sendMailBroomTrialRequest } from "@/lib/mailbroom-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSUMER_DOMAINS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com",
  "icloud.com", "aol.com", "btinternet.com", "btopenworld.com",
]);

// Public, unauthenticated endpoint that now hands back a real scheduling
// link — rate-limited per IP+email so a script can't rapid-fire fake
// submissions just to harvest the booking link or flood spurious meetings
// onto the calendar. Same in-memory pattern used elsewhere for public
// endpoints like this (e.g. mailbroom-web's affiliate sign-in/quiz routes).
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 3;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > MAX_ATTEMPTS_PER_WINDOW;
}

// Best-effort — reports this request back to intellireach's existing
// attribution hook (same one bulk campaign conversions already use) so a
// tracked link's click can be attributed all the way through to a real
// trial request, not just a click. `ref` is only present when this visit
// came from a tracked intellireach link; a missing/unmatched ref is a no-op
// on the receiving end, not an error. Never blocks or fails the actual
// trial request if this call fails — that's the load-bearing part of this
// route, attribution is a nice-to-have on top.
async function reportAttribution(ref: string, event: string) {
  const secret = process.env.ATTRIBUTION_SECRET;
  const baseUrl = process.env.INTELLIREACH_BASE_URL ?? "https://outreach.mailbroom.app";
  if (!secret) return;
  try {
    await fetch(`${baseUrl}/api/attribution/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ ref, event }),
    });
  } catch (err) {
    console.error("Failed to report trial-request attribution:", err);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { contactName, workEmail, companyName, userCount, notes, requestType, ref } = body;

  const name = typeof contactName === "string" ? contactName.trim().slice(0, 200) : "";
  const email = typeof workEmail === "string" ? workEmail.trim().slice(0, 320) : "";
  const company = typeof companyName === "string" ? companyName.trim().slice(0, 200) : "";
  const users = typeof userCount === "string" ? userCount.trim().slice(0, 50) : "";
  const note = typeof notes === "string" ? notes.trim().slice(0, 1000) : "";
  const type = requestType === "demo" ? "demo" : "trial";

  if (!name || !company) {
    return NextResponse.json({ error: "Name and company are required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid work email is required" }, { status: 400 });
  }
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (CONSUMER_DOMAINS.has(domain)) {
    return NextResponse.json(
      { error: "Please use your company email address — MailBroom for Business is licensed per company domain." },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(`${ip}:${email.toLowerCase()}`)) {
    return NextResponse.json({ error: "Too many requests — please try again later or email mailbroom@aiert.co.uk directly." }, { status: 429 });
  }

  try {
    await sendMailBroomTrialRequest({ contactName: name, workEmail: email, companyName: company, userCount: users, notes: note, requestType: type });
  } catch (err) {
    console.error("Failed to send trial request email:", err);
    return NextResponse.json({ error: "Failed to submit — please try again or email mailbroom@aiert.co.uk directly." }, { status: 502 });
  }

  if (typeof ref === "string" && ref) {
    await reportAttribution(ref, `${type}_requested`);
  }

  // Only returned after a valid submission — kept out of the client bundle
  // entirely (not a build-time constant in TrialRequestForm.tsx) so the
  // booking page can't be reached by just reading the page source/network
  // tab without actually submitting a real name/company/work email first.
  const bookingLink = type === "demo" ? process.env.MAILBROOM_BOOKING_LINK : undefined;

  return NextResponse.json({ ok: true, bookingLink });
}
