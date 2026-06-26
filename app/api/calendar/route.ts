import { NextResponse } from "next/server";
import { buildAnniversaryIcs } from "@/lib/calendarInvite";

export async function GET() {
  return new NextResponse(buildAnniversaryIcs(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8; method=PUBLISH",
      "Content-Disposition": 'attachment; filename="anniversary-dinner.ics"',
    },
  });
}
