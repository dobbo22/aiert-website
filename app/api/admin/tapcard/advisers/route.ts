import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { adminAddUser, adminCreateAdviser, adminExtendTrial, adminRecordContract, adminRemoveUser, adminSetTier } from "@/lib/tapcardAdviserAdmin";

// AIERT admin only: set up advisers and their staff, confirm a company's tier, extend a trial.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const s = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : "");
  let r: { ok: boolean; error?: string; adviserId?: string };
  switch (b.action) {
    case "createAdviser": r = await adminCreateAdviser(s("name"), s("email"), s("staffName"), b.senior !== false); break;
    case "addUser": r = await adminAddUser(s("adviserId"), s("email"), s("name"), b.senior === true); break;
    case "removeUser": r = await adminRemoveUser(s("adviserId"), s("email")); break;
    case "setTier": r = await adminSetTier(s("linkId"), Number(b.tier)); break;
    case "recordContract": r = await adminRecordContract(s("linkId"), s("ref"), s("signedAt"), s("signedBy"), s("url")); break;
    case "extendTrial": r = await adminExtendTrial(s("adviserId"), Number(b.days)); break;
    default: return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}
