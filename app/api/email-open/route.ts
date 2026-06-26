import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64"
);

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (code) {
    try {
      await sql`
        UPDATE anniversary_invitees
        SET
          invite_opened_at = now(),
          invite_open_count = invite_open_count + 1
        WHERE code = ${code}
      `;
    } catch {
      // Ignore — never let tracking failures affect pixel delivery.
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
