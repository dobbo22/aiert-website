import { NextRequest, NextResponse } from "next/server";
import { addCardRecipient, getCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";

interface Body {
  name?: string;
  phone?: string;
  email?: string;
}

// Called right after the app's contact picker returns someone, so the
// server can track them for update notifications (lib/tapcardRecipientEmail.ts)
// and hand back the exact message text both apps show in the SMS/mail
// compose sheet — kept in one place so the copy can't drift between iOS and
// Android.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = readEditToken(req);
  if (!token) return NextResponse.json({ error: "edit token required" }, { status: 401 });

  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, token))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json()) as Body;
  const name = (body.name ?? "").trim().slice(0, 200);
  const phone = (body.phone ?? "").trim().slice(0, 60);
  const email = (body.email ?? "").trim().slice(0, 200);
  if (!phone && !email) {
    return NextResponse.json({ error: "a phone number or email is required" }, { status: 400 });
  }

  const recipient = await addCardRecipient(id, name, phone, email);
  const link = `https://tapcard.aiert.co.uk/c/${id}`;
  const ownerName = card.name || "I";
  const shareText = `This is my TapCard — ${ownerName}'s digital business card: ${link}. It always shows my latest contact details, even if I change job or number, so you'll never have an old version.`;

  return NextResponse.json({ id: recipient.id, shareText });
}
