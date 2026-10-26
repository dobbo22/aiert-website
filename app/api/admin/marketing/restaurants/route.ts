import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { RESTAURANT_SUBJECTS } from "@/lib/mailshot";
import {
  HARD_DAILY_LIMIT, bringOverEarlierMailing, dashboard, importLeads, leadTimeline, queueHeld, sendBatch, sendTest, updateLead,
} from "@/lib/marketing";

// The Restaurants & cafes marketing page's data and actions (see lib/marketing.ts). Admin only.
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const lead = Number(url.searchParams.get("timeline"));
    if (Number.isInteger(lead) && lead > 0) return NextResponse.json({ timeline: await leadTimeline(lead) });
    return NextResponse.json({ ...(await dashboard()), subjects: RESTAURANT_SUBJECTS, hardLimit: HARD_DAILY_LIMIT });
  } catch (e) {
    console.error("marketing dashboard failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load the results" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    switch (body.action) {
      case "import": {
        const text = String(body.text ?? "");
        if (text.length > 2_000_000) return NextResponse.json({ error: "That file is too big" }, { status: 413 });
        const result = await importLeads(text, { batch: String(body.batch ?? ""), includeUnchecked: body.includeUnchecked === true, includePersonal: body.includePersonal === true });
        return NextResponse.json({ ok: true, result });
      }
      case "bring-over":
        return NextResponse.json({ ok: true, result: await bringOverEarlierMailing() });
      case "queue-held":
        return NextResponse.json({ ok: true, queued: await queueHeld() });
      case "test":
        await sendTest(String(body.to ?? ""), body.sample === "cafe" ? "cafe" : "restaurant", Number(body.subjectIndex) || 0);
        return NextResponse.json({ ok: true });
      case "send":
        return NextResponse.json({ ok: true, ...(await sendBatch({ count: Number(body.count) || 25, dailyCap: Number(body.dailyCap) || 50, subjectIndex: Number(body.subjectIndex) || 0, override: body.override === true })) });
      case "lead": {
        const id = Number(body.id);
        if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid lead" }, { status: 400 });
        await updateLead(id, { stage: typeof body.stage === "string" ? body.stage : undefined, notes: typeof body.notes === "string" ? body.notes : undefined, state: typeof body.state === "string" ? body.state : undefined, kind: typeof body.kind === "string" ? body.kind : undefined });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    console.error("marketing action failed", body.action, e);
    // A pause or a limit is a message for you, not a crash.
    return NextResponse.json({ error: message }, { status: /paused|limit|api key|nothing|enter an email/i.test(message) ? 409 : 500 });
  }
}
