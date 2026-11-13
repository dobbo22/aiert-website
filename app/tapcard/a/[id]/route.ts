import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { isRobotAgent, recordAnnouncementOpen } from "@/lib/tapcardInsights";
import { after } from "next/server";

// A listed company's announcement link: counts the tap, then sends the person on to the company's own page. Only https links the
// company itself posted are followed (cleaned when posted). Link previews and scanners are not counted.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = /^\d{1,12}$/.test(id) ? Number(id) : NaN;
  if (!Number.isFinite(n)) return new NextResponse("Not found", { status: 404 });
  const row = ((await sql`SELECT link FROM tapcard_announcements WHERE id = ${n} AND withdrawn = false`.catch(() => [])) as { link: string | null }[])[0];
  let target: URL | null = null;
  try { target = row?.link ? new URL(row.link) : null; } catch { target = null; }
  if (!target || target.protocol !== "https:") return new NextResponse("Not found", { status: 404 });
  if (!isRobotAgent(req.headers.get("user-agent"))) after(() => recordAnnouncementOpen(n));
  return NextResponse.redirect(target.toString(), 302);
}
