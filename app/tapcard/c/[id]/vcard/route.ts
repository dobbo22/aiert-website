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
  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.vcf"`,
    },
  });
}
