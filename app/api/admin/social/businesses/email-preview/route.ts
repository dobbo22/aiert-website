import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { buildAppUserEmails } from "@/lib/appUserCampaign";

// The email as one recipient would see it (admin only).
export async function GET(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = (req.nextUrl.searchParams.get("email") ?? "").toLowerCase();
  const r = (await buildAppUserEmails()).find((x) => x.email.toLowerCase() === email);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(r.html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
