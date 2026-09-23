import { NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { buildPkpass } from "@/lib/pkpass";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });

  const shareURL = `https://tapcard.aiert.co.uk/c/${id}`;
  const pkpass = await buildPkpass(card, shareURL);

  return new NextResponse(new Uint8Array(pkpass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${id}.pkpass"`,
    },
  });
}
