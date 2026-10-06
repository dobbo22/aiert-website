import { NextRequest, NextResponse } from "next/server";
import { acceptRecipient } from "@/lib/tapcardDb";

interface Body {
  token?: string;
  name?: string;
  phone?: string;
  email?: string;
}

// The recipient sharing their own details back (AcceptRecipientForm, on the
// public card page) — not the card owner, so no edit token here. The
// unguessable accept_token is the only credential, same trust model as the
// unsubscribe token.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as Body;
  const token = (body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const name = (body.name ?? "").trim().slice(0, 200);
  const phone = (body.phone ?? "").trim().slice(0, 60);
  const email = (body.email ?? "").trim().slice(0, 200);
  if (!name && !phone && !email) {
    return NextResponse.json({ error: "enter at least one detail" }, { status: 400 });
  }

  const cardId = await acceptRecipient(token, name, phone, email);
  if (!cardId || cardId !== id) {
    return NextResponse.json({ error: "this link has expired or is no longer valid" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
