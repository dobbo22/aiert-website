import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { mapkitJsToken } from "@/lib/appleMaps";

// MapKit JS token for the admin's walk-in page. Only for the signed-in admin, and only for AIERT's own origins.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const host = (req.headers.get("host") ?? "").split(":")[0];
  if (!/^(www\.)?aiert\.co\.uk$/.test(host)) return NextResponse.json({ error: "not available on this host" }, { status: 400 });
  const token = mapkitJsToken(`https://${host}`);
  if (!token) return NextResponse.json({ error: "Apple Maps is not set up" }, { status: 503 });
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
