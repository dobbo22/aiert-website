import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { importMailshotList, importRestaurants, parseMailshotList, parseRestaurantList } from "@/lib/mailshot";

export const maxDuration = 60;

// Reads a pasted list or CSV text and adds the usable, non-unsubscribed addresses to a campaign's list.
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const campaign = String(body?.campaign ?? "").trim().slice(0, 30);
  const text = String(body?.text ?? "");
  if (!campaign || !text.trim()) return NextResponse.json({ error: "campaign and list are required" }, { status: 400 });
  if (body?.kind === "restaurant") {
    const restaurants = parseRestaurantList(text);
    if (!restaurants.length) return NextResponse.json({ error: "No restaurants found. The first row needs headers: name, email, phone, website, address, booking, menu" }, { status: 400 });
    try {
      return NextResponse.json({ ok: true, summary: await importRestaurants(campaign, restaurants, body?.includePersonal === true, body?.includeUnchecked === true) });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
    }
  }
  const rows = parseMailshotList(text);
  if (!rows.length) return NextResponse.json({ error: "No email addresses found in that list" }, { status: 400 });
  if (rows.length > 20000) return NextResponse.json({ error: "That is more than 20,000 rows; split the file" }, { status: 400 });
  try {
    const summary = await importMailshotList(campaign, rows, body?.includePersonal === true);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 500 });
  }
}
