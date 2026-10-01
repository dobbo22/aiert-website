import type { NextRequest } from "next/server";
import { handleInviteClick } from "@/lib/inviteClickHandler";

// A person's "pass it on" link: every click is a referral by them, never
// their own click — see lib/inviteClickHandler.ts.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return handleInviteClick(req, (await params).token, "share");
}
