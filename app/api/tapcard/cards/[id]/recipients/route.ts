import { NextRequest, NextResponse } from "next/server";
import { addCardRecipient, getCard, listRecipients } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  /// Newer apps say they will report whether the share sheet really sent (PUT .../recipients/<id>).
  reportsSend?: boolean;
}

// The owner's view of everyone they've sent this card to directly, with
// acceptance status — the app calls this whenever the Contacts tab opens to
// refresh "Pending"/"Accepted" locally (no push infrastructure yet, see the
// card-save route's notify-on-change for the one place this app does push
// anything, which is email, not APNs).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = readEditToken(req);
  if (!token) return NextResponse.json({ error: "edit token required" }, { status: 401 });

  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(card, token))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const recipients = await listRecipients(id);
  return NextResponse.json({
    recipients: recipients.map((r) => ({
      id: Number(r.id), // bigserial arrives as a string; the apps decode a number
      acceptedAt: r.accepted_at,
      acceptedName: r.accepted_name,
      acceptedPhone: r.accepted_phone,
      acceptedEmail: r.accepted_email,
      acceptedTitle: r.accepted_title,
      acceptedCompany: r.accepted_company,
      acceptedWebsite: r.accepted_website,
      openedAt: r.opened_at,
      openCount: r.open_count,
      sent: !!r.sent_at || r.sent_legacy !== false,
      sentAt: r.sent_at ?? null,
      source: r.source ?? "owner",
      createdAt: r.created_at,
    })),
  });
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

  const parsed = (await req.json().catch(() => null)) as Body | null;

  if (!parsed || typeof parsed !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const body: Body = parsed;
  const name = (body.name ?? "").trim().slice(0, 200);
  const phone = (body.phone ?? "").trim().slice(0, 60);
  const email = (body.email ?? "").trim().slice(0, 200);
  if (!phone && !email) {
    return NextResponse.json({ error: "a phone number or email is required" }, { status: 400 });
  }

  const recipient = await addCardRecipient(id, name, phone, email, body.reportsSend === true);
  // The accept token on the link is what lets AcceptRecipientForm (on the
  // public card page) identify which recipient row a "share your details
  // back" submission belongs to.
  const link = `https://tapcard.aiert.co.uk/c/${id}${recipient.accept_token ? `?a=${recipient.accept_token}` : ""}`;
  // The card id rides on the download link, so an Android install from this message is credited to this card (Play install referrer).
  const ownerName = card.name || "I";
  const shareText = `This is my TapCard — ${ownerName}'s digital business card: ${link}. It always shows my latest contact details, even if I change job or number, so you'll never have an old version.\n\nGet the app: https://tapcard.aiert.co.uk/go/tapcard-web-share-get-tapcard?card=${id}`;

  // The id column is a bigint, which the database driver returns as text; the iPhone app decodes it as a number and failed to ("Couldn't send to that contact").
  return NextResponse.json({ id: Number(recipient.id), shareText });
}
