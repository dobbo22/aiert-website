import { NextRequest, NextResponse } from "next/server";
import { sendMailBroomTrialRequest } from "@/lib/mailbroom-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSUMER_DOMAINS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "live.com", "yahoo.com",
  "icloud.com", "aol.com", "btinternet.com", "btopenworld.com",
]);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { contactName, workEmail, companyName, userCount, notes, requestType } = body;

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

  try {
    await sendMailBroomTrialRequest({ contactName: name, workEmail: email, companyName: company, userCount: users, notes: note, requestType: type });
  } catch (err) {
    console.error("Failed to send trial request email:", err);
    return NextResponse.json({ error: "Failed to submit — please try again or email mailbroom@aiert.co.uk directly." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
