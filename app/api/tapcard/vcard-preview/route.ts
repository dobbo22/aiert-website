import { NextRequest, NextResponse } from "next/server";
import { buildVCard } from "@/lib/tapcardVcard";

// A vCard built straight from query-string fields — no stored card, no id.
// Used by AcceptRecipientForm's "Just save my contact" button so someone
// who was sent a TapCard can keep their own details without installing the
// app or anything being saved server-side beyond what the accept endpoint
// already stored.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const name = (params.get("name") ?? "").trim().slice(0, 200);
  const vcf = buildVCard({
    name,
    title: (params.get("title") ?? "").trim().slice(0, 200),
    company: (params.get("company") ?? "").trim().slice(0, 200),
    phone: (params.get("phone") ?? "").trim().slice(0, 60),
    email: (params.get("email") ?? "").trim().slice(0, 200),
    website: (params.get("website") ?? "").trim().slice(0, 300),
  });
  const filename = (name || "contact").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.vcf"`,
    },
  });
}
