import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { importPromoCodes, promoCodeStats } from "@/lib/promoCodes";

// Free-months codes for the first restaurants: GET = how many are left, POST { platform, text } = import a list.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await promoCodeStats());
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const platform = body?.platform === "android" ? "android" : body?.platform === "ios" ? "ios" : null;
  const text = typeof body?.text === "string" ? body.text : "";
  if (!platform || !text.trim()) return NextResponse.json({ error: "Choose iPhone or Android and paste the codes" }, { status: 400 });
  const result = await importPromoCodes(platform, text);
  return NextResponse.json({ ok: true, ...result, stats: await promoCodeStats() });
}
