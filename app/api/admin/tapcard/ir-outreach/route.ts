import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { addIrRecipient, deleteIrRecipient, IR_TOKEN_RE, markIrSent } from "@/lib/tapcardIrOutreach";

// AIERT admin only: add a person to write to (gives back their personal link), mark their email as sent, or remove them.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; name?: string; org?: string; note?: string; token?: string } | null;
  if (!b) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (b.action === "add") {
    const name = (b.name ?? "").trim();
    if (name.length < 2) return NextResponse.json({ error: "Give a name." }, { status: 400 });
    return NextResponse.json({ ok: true, ...(await addIrRecipient(name, b.org ?? "", b.note ?? "")) });
  }
  if (typeof b.token === "string" && IR_TOKEN_RE.test(b.token)) {
    if (b.action === "sent") { await markIrSent(b.token); return NextResponse.json({ ok: true }); }
    if (b.action === "delete") { await deleteIrRecipient(b.token); return NextResponse.json({ ok: true }); }
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
