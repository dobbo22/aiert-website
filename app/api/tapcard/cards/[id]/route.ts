import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { followTargetFor, getPrivacyUrl, isListedCard } from "@/lib/tapcardShare";

// A listed company card says listedCompany. A person's card in a listed company says followCardId: where "follow" really goes.
async function listedFields(id: string): Promise<Record<string, unknown>> {
  if (await isListedCard(id).catch(() => false)) return { listedCompany: true };
  const target = await followTargetFor(id).catch(() => id);
  return target !== id ? { listedCompany: true, followCardId: target } : {};
}
import { deleteCard, getCard, publicCardJSON, updateCard } from "@/lib/tapcardDb";
import { canEdit, readEditToken } from "@/lib/tapcardAuth";
import { publicAnnouncement, publicOffer } from "@/lib/tapcardOffers";
import { wasRemovedByCompany } from "@/lib/tapcardBiz";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// The same details the public /c/[id] page shows, as JSON — lets the app
// show a scanned card natively (and save it) when the link opens TapCard.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) {
    // 410 (not 404) for a card its company removed, so the owner's phone can tell and take it off.
    if (await wasRemovedByCompany(id).catch(() => false)) return NextResponse.json({ error: "removed", removedByCompany: true }, { status: 410 });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // The special offer (if any) rides along so a saved card's next refresh shows it in the app's updates.
  const offer = await publicOffer(id).catch(() => null);
  const announcement = await publicAnnouncement(id).catch(() => null);
  const listed = await listedFields(id);
  // A listed company's card: its own privacy notice, and (when the app passes ?e=<event code> from a scanned QR) the event's name and slot.
  const extra: Record<string, unknown> = {};
  if (listed.listedCompany) {
    const target = typeof listed.followCardId === "string" ? listed.followCardId : id;
    const priv = await getPrivacyUrl(target).catch(() => "");
    if (priv) extra.companyPrivacyURL = priv;
    const code = new URL(req.url).searchParams.get("e");
    if (code) {
      const { cardOrgId } = await import("@/lib/tapcardBiz");
      const { eventInfoForOrg } = await import("@/lib/tapcardEvents");
      // `at` = when the person scanned (ms): so a late registration names the slot it was made in, not the slot running now.
      const { cleanScanTime } = await import("@/lib/tapcardShareRules");
      const scanned = cleanScanTime(Number(new URL(req.url).searchParams.get("at")) || null);
      const ev = await eventInfoForOrg(code, await cardOrgId(target).catch(() => null), scanned ?? new Date()).catch(() => null);
      if (ev) extra.event = { code: ev.code, label: ev.label, slot: ev.slot };
    }
  }
  return NextResponse.json({ ...publicCardJSON(card), ...listed, ...extra, ...(offer ? { offer } : {}), ...(announcement ? { announcement } : {}) });
}

// "Stop sharing" — the delete/revoke control called for in the plan's
// privacy section. Once deleted, the id 404s everywhere (public page,
// vCard download, Wallet pass) until the app re-shares and gets a fresh id.
// Needs the card's edit token (lib/tapcardAuth.ts) — the id alone is public.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getCard(id);
  // Deleting a card that is already gone (removed by its company, or stopped elsewhere) is a success: there is nothing
  // left to remove, and older apps refuse to delete the card from the phone while this answered 404.
  if (!existing) return NextResponse.json({ ok: true, alreadyGone: true });
  if (!(await canEdit(existing, readEditToken(req)))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await deleteCard(id);
  // The photo lives at its own public Blob URL — without this it stayed
  // reachable after "Stop sharing". Best-effort: the card itself is gone.
  if (existing.photo_url) await del(existing.photo_url).catch(() => {});
  return NextResponse.json({ ok: true });
}

// Photo upload for an existing card. Kept as its own endpoint (multipart)
// rather than folded into the JSON POST /api/tapcard/cards route, since a
// photo is optional and separately-sized from the rest of the fields.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getCard(id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canEdit(existing, readEditToken(req)))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/heic"].includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "photo must be a JPEG/PNG/HEIC under 5 MB" }, { status: 400 });
  }

  const blob = await put(`tapcard/${id}-${Date.now()}`, file, { access: "public" });
  await updateCard(id, { ...existing, photo_url: blob.url });
  // Each upload gets a new URL, so remove the photo it replaced.
  if (existing.photo_url) await del(existing.photo_url).catch(() => {});
  return NextResponse.json({ url: blob.url });
}
