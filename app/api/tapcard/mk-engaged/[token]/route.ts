import { NextResponse } from "next/server";
import { recordEngaged } from "@/lib/marketing";
import { isBotUserAgent } from "@/lib/tapcardInvites";

// A real person used their sample card (a tap or scroll, sent from the page by the browser). Email scanners never do this.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^mk-[A-Za-z0-9_-]{6,40}$/.test(token) || isBotUserAgent(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const what = (await req.text().catch(() => "")).slice(0, 80).replace(/[^\w .,'&/-]/g, "");
  await recordEngaged(token, what).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
