import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { parseStockListFiles } from "@/lib/lseStockList";
import { applyImport, diffImport, loadStartingList, nextUnchecked, removeDelisted, runBoardCheck, runInvestorCheck, setInvestorUrls, storedInvestorHand, runWebsiteCheck, setWebsite, storedBoardEvidence, storedEvidence, storedInvestorEvidence, MIN_FULL_LIST } from "@/lib/tapcardListedUniverse";

// AIERT admin only. JSON actions: load (starting list into an empty table), remove-delisted, set-website.
// Form upload (multipart, field "files" = the LSE stock-list .xlsx files, field "action" = preview or apply).
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const action = String(form.get("action") ?? "preview");
      const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
      if (!files.length) return NextResponse.json({ error: "Choose the LSE stock list files first." }, { status: 400 });
      if (files.some((f) => f.size > 5_000_000)) return NextResponse.json({ error: "A file is too large to be an LSE stock list." }, { status: 400 });
      const parsed = await parseStockListFiles(await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) }))));
      if (action === "apply") {
        const r = await applyImport(parsed.items, parsed.asOf, String(form.get("remove") ?? "") === "1");
        return r.ok ? NextResponse.json({ ok: true, applied: true, perFile: parsed.perFile, diff: r.diff, deleted: r.deleted, kept: r.kept }) : NextResponse.json({ error: r.error }, { status: 400 });
      }
      const diff = await diffImport(parsed.items, parsed.asOf);
      return NextResponse.json({ ok: true, applied: false, perFile: parsed.perFile, diff, complete: parsed.items.length >= MIN_FULL_LIST, skippedNonShares: parsed.skipped });
    }
    const b = (await req.json().catch(() => null)) as { action?: string; isin?: string; website?: string; urls?: Record<string, string> } | null;
    if (!b) return NextResponse.json({ error: "bad request" }, { status: 400 });
    if (b.action === "load") {
      const r = await loadStartingList();
      return r.ok ? NextResponse.json({ ok: true, added: r.added }) : NextResponse.json({ error: r.error }, { status: 400 });
    }
    if (b.action === "remove-delisted") return NextResponse.json({ ok: true, ...(await removeDelisted()) });
    if (b.action === "set-website" && typeof b.isin === "string") {
      const ok = await setWebsite(b.isin, b.website ?? "");
      return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "That does not look like a web address (start with https://)." }, { status: 400 });
    }
    if (b.action === "check-website") {
      const isin = typeof b.isin === "string" && b.isin ? b.isin : await nextUnchecked();
      if (!isin) return NextResponse.json({ error: "Every listed company has been checked." }, { status: 404 });
      const r = await runWebsiteCheck(isin);
      return r.ok ? NextResponse.json({ ok: true, name: r.name, result: r.result }) : NextResponse.json({ error: r.error }, { status: 404 });
    }
    if (b.action === "set-investor-urls" && typeof b.isin === "string" && b.urls && typeof b.urls === "object") {
      const ok = await setInvestorUrls(b.isin, b.urls);
      return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Each link must be a full https:// address." }, { status: 400 });
    }
    if (b.action === "investor-hand" && typeof b.isin === "string") return NextResponse.json({ ok: true, hand: await storedInvestorHand(b.isin) });
    if (b.action === "check-investor" && typeof b.isin === "string") {
      const r = await runInvestorCheck(b.isin);
      return r.ok ? NextResponse.json({ ok: true, name: r.name, result: r.result }) : NextResponse.json({ error: r.error }, { status: 400 });
    }
    if (b.action === "check-board" && typeof b.isin === "string") {
      const r = await runBoardCheck(b.isin);
      return r.ok ? NextResponse.json({ ok: true, name: r.name, result: r.result }) : NextResponse.json({ error: r.error }, { status: 400 });
    }
    if (b.action === "evidence" && typeof b.isin === "string") return NextResponse.json({ ok: true, ...(await storedEvidence(b.isin)), investor: await storedInvestorEvidence(b.isin), board: await storedBoardEvidence(b.isin) });
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 400 });
  }
}
