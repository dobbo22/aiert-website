import { NextRequest, NextResponse } from "next/server";
import { findListedOrgs, requireAdviser } from "@/lib/tapcardAdvisers";

// Name search over companies that are set up for investor relations (so an adviser can ask one to approve it). Signed-in advisers only.
export async function GET(req: NextRequest) {
  if (!(await requireAdviser())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  return NextResponse.json({ companies: await findListedOrgs(req.nextUrl.searchParams.get("q") ?? "") });
}
