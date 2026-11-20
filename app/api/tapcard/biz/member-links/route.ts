import { NextRequest, NextResponse } from "next/server";
import { requireBizSession } from "@/lib/tapcardBizSession";
import { cleanWebhookUrl, createMemberKey, deliveryLog, listMemberKeys, memberLinkConfig, revokeMemberKey, rotateWebhookSecret, sendTestEvent, setWebhook, webhookSecret } from "@/lib/tapcardMemberLinks";

// The Integration tab's actions. Admins only; nothing works for a company that has not been switched on.
export async function POST(req: NextRequest) {
  const session = await requireBizSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const cfg = await memberLinkConfig(session.orgId);
  if (!cfg) return NextResponse.json({ error: "Member links are not switched on for your company. Email enquiries@aiert.co.uk." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { action?: string; url?: unknown; label?: unknown; id?: unknown } | null;
  const state = async () => ({ log: await deliveryLog(session.orgId), keys: await listMemberKeys(session.orgId), webhookUrl: (await memberLinkConfig(session.orgId))?.webhookUrl ?? "" });
  switch (body?.action) {
    case "set-webhook": {
      if (body.url === "" || body.url === null) { await setWebhook(session.orgId, null); return NextResponse.json({ ok: true, ...(await state()) }); }
      const v = await cleanWebhookUrl(body.url);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      await setWebhook(session.orgId, v.url);
      return NextResponse.json({ ok: true, secret: webhookSecret(session.orgId, cfg.secretVersion), ...(await state()) });
    }
    case "show-secret":
      return NextResponse.json({ ok: true, secret: webhookSecret(session.orgId, cfg.secretVersion) }, { headers: { "cache-control": "no-store" } });
    case "rotate-secret": {
      const secret = await rotateWebhookSecret(session.orgId);
      return NextResponse.json({ ok: true, secret, ...(await state()) });
    }
    case "test": {
      const r = await sendTestEvent(session.orgId);
      return NextResponse.json({ ok: true, test: r, ...(await state()) });
    }
    case "create-key": {
      const made = await createMemberKey(session.orgId, session.email, typeof body.label === "string" ? body.label : "");
      if (!made.ok) return NextResponse.json({ error: made.error }, { status: 400 });
      return NextResponse.json({ ok: true, key: made.key, ...(await state()) });
    }
    case "revoke-key": {
      if (!Number.isInteger(body.id) || !(await revokeMemberKey(session.orgId, Number(body.id)))) return NextResponse.json({ error: "That key is already revoked or isn't yours." }, { status: 404 });
      return NextResponse.json({ ok: true, ...(await state()) });
    }
    default:
      return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
