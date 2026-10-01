import type { NextRequest } from "next/server";
import { handleInviteClick } from "@/lib/inviteClickHandler";

// A person's own invite link — see lib/inviteClickHandler.ts.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  return handleInviteClick(req, (await params).token, "direct");
}
