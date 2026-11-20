import { NextResponse, type NextRequest } from "next/server";
import { openAppDestination } from "@/lib/tapcardOpenApp";

// tapcard.aiert.co.uk/open/<slug>: opens a company's own app (see lib/tapcardOpenApp.ts). Nothing is logged or stored.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const to = openAppDestination(slug, req.headers.get("user-agent") ?? "");
  if (!to) return new NextResponse("Not found", { status: 404 });
  const res = NextResponse.redirect(to, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
