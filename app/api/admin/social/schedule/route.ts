import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put } from "@vercel/blob";
import { isValidAdminSession, COOKIE_NAME } from "@/lib/mailbroomAdminAuth";
import { enqueue, londonToUtc, runDue, TARGETS, type NewItem, type Target } from "@/lib/socialQueue";
import type { PollInput } from "@/lib/linkedinApi";

const DURATIONS = ["ONE_DAY", "THREE_DAYS", "SEVEN_DAYS", "FOURTEEN_DAYS"];

export async function POST(req: NextRequest) {
  const session = (await cookies()).get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const kind = String(form.get("kind") ?? "post") as NewItem["kind"];
  const targets = form.getAll("targets").map(String).filter((t): t is Target => (TARGETS as string[]).includes(t));
  const when = String(form.get("when") ?? "");
  const file = form.get("file");

  try {
    const runNow = when === "";
    const runAt = runNow ? new Date() : londonToUtc(when);
    if (!runNow && runAt.getTime() < Date.now() - 60_000) throw new Error("That time has already passed");

    let poll: PollInput | undefined;
    if (kind === "poll") {
      const duration = String(form.get("pollDuration") ?? "THREE_DAYS");
      if (!DURATIONS.includes(duration)) throw new Error("Choose how long the poll runs");
      poll = {
        question: String(form.get("pollQuestion") ?? ""),
        options: ["pollOption1", "pollOption2", "pollOption3", "pollOption4"].map((k) => String(form.get(k) ?? "")).filter((o) => o.trim()),
        duration: duration as PollInput["duration"],
      };
    }

    let mediaUrl: string | undefined;
    let mediaName: string | undefined;
    if (file instanceof File && file.size > 0 && kind !== "poll") {
      if (kind === "document" && !/\.(pdf|pptx?|docx?)$/i.test(file.name)) throw new Error("Attach a PDF, PowerPoint or Word file");
      if (kind === "post" && !file.type.startsWith("image/")) throw new Error("Attach an image");
      const blob = await put(`social/${Date.now()}-${file.name}`, file, { access: "public" });
      mediaUrl = blob.url;
      mediaName = file.name;
    }

    const id = await enqueue({ runAt, targets, kind, body: String(form.get("body") ?? ""), mediaUrl, mediaName, poll });
    // "Post now" publishes straight away instead of waiting for the next 15-minute run.
    const ran = runNow ? await runDue() : null;
    return NextResponse.json({ ok: true, id, ran });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
