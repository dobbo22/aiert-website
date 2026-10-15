import { NextRequest, NextResponse } from "next/server";
import { getCard } from "@/lib/tapcardDb";
import { recordInstall } from "@/lib/tapcardOffers";

// A phone tells us it was installed after a visit to this business's card page (the install carried the business through to the
// app's first launch). `install` is the random id the app keeps on the device; it is hashed and only ever counted.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { install?: unknown; platform?: unknown } | null;
  const install = typeof body?.install === "string" ? body.install : "";
  if (install.length < 16 || install.length > 200) return NextResponse.json({ error: "install is required" }, { status: 400 });
  if (!(await getCard(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  await recordInstall(id, install, typeof body?.platform === "string" ? body.platform : "");
  return NextResponse.json({ ok: true });
}
