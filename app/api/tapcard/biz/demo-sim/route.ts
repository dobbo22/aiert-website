import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { simArrive, simClear, simResults } from "@/lib/tapcardDemoSim";

// The simulated AGM for the demo company only (Example Resources plc, on the demo list). Admins of that company; refused for anyone else.
// The page calls it in small batches so the admin moves while it runs. See lib/tapcardDemoSim.ts.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: unknown; event?: unknown; count?: unknown; start?: unknown; taps?: unknown; late?: unknown } | null;
  let r;
  if (body?.action === "arrive") r = await simArrive(session.orgId, String(body.event ?? ""), body.count, body.start);
  else if (body?.action === "results") r = await simResults(session.orgId, body.taps, body.late, body.start);
  else if (body?.action === "clear") r = await simClear(session.orgId);
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 403 });
}
