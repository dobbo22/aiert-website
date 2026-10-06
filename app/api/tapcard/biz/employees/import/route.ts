import { NextRequest, NextResponse } from "next/server";
import { getOrg, importEmployees, issueClaimToken, orgCanProvision } from "@/lib/tapcardBiz";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { sendBizClaimEmail } from "@/lib/tapcardBizEmail";

const MAX_PER_REQUEST = 1000;

interface Body {
  employees?: { name?: string; email?: string; title?: string }[];
}

// Bulk employee upload — INSERT ... SELECT * FROM unnest(...) ON CONFLICT
// DO UPDATE (lib/tapcardBiz.ts's importEmployees), the same batch-upsert
// shape app/api/admin/invites/import/route.ts already uses, since the Neon
// HTTP driver can't run a multi-statement transaction. Only brand-new rows
// get a claim email — re-importing someone already invited (or claimed)
// never resends/reprovisions them.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const org = await getOrg(session.orgId);
  if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!orgCanProvision(org)) {
    return NextResponse.json({ error: "billing isn't active for this account yet" }, { status: 402 });
  }

  const body = (await req.json()) as Body;
  const rows = (body.employees ?? [])
    .filter((e) => (e.email ?? "").trim() && /^\S+@\S+\.\S+$/.test((e.email ?? "").trim()))
    .slice(0, MAX_PER_REQUEST)
    .map((e) => ({ name: (e.name ?? "").trim(), email: (e.email ?? "").trim(), title: (e.title ?? "").trim() }));

  if (rows.length === 0) return NextResponse.json({ error: "no valid rows" }, { status: 400 });

  const result = await importEmployees(org.id, rows);
  const newOnes = result.filter((r) => r.isNew);

  const origin = "https://tapcard.aiert.co.uk";
  await Promise.all(
    newOnes.map(async (employee) => {
      const token = await issueClaimToken(employee.id);
      if (!token) return;
      await sendBizClaimEmail(employee.email, employee.name, org.name, `${origin}/business/claim/${token}`).catch((e) => console.error("tapcard biz email failed:", e));
    })
  );

  return NextResponse.json({ imported: result.length, invited: newOnes.length });
}
