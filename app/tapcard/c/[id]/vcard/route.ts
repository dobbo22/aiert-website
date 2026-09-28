import { NextResponse } from "next/server";
import { after } from "next/server";
import { getCard, incrementSaveCount } from "@/lib/tapcardDb";
import { buildVCard } from "@/lib/tapcardVcard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });

  after(() => incrementSaveCount(id));

  const vcf = buildVCard(card);
  const filename = (card.name || "contact").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  // "inline" (not "attachment"), tried as a fix for Android Chrome: with
  // attachment it always shows a "Choose where to download" dialog and then
  // saves silently with no prompt to actually import the card, unlike iOS
  // Safari which opens the native Add Contact screen immediately either way.
  // text/x-vcard is what older Android intent-filters for vCard match on.
  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/x-vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}.vcf"`,
    },
  });
}
