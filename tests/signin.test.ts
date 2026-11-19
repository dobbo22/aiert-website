import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db, ctx } from "./helpers/pgdb";
installStubs();

test("one sign-in: an administrator, an adviser, someone who is both, and an unknown address all get the same answer, and only real accounts get the right email", async () => {
  await (await import("../lib/tapcardDb")).getCard("none");
  await (await import("../lib/tapcardNewsPolicy")).ensurePolicySchema();
  const biz = await import("../lib/tapcardBiz");
  const adv = await import("../lib/tapcardAdvisers");
  await adv.ensureAdviserSchema();
  const orgId = (await biz.createOrg("Signin plc", "signin.example")).id;
  await db`INSERT INTO tapcard_biz_admins (id, org_id, email, role, senior) VALUES ('id-a', ${orgId}, 'admin@signin.example', 'admin', true), ('id-b', ${orgId}, 'both@signin.example', 'admin', true) ON CONFLICT DO NOTHING`;
  await adv.createAdviser("Signin Advisory", [{ email: "adviser@signin.example", name: "Ad", senior: true }, { email: "both@signin.example", name: "Both", senior: false }]);

  const { POST } = await import("../app/api/tapcard/signin/route");
  let n = 0;
  const call = async (email: string) => {
    const req = new Request("https://tapcard.aiert.co.uk/api/tapcard/signin", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.9.9.${++n}` }, body: JSON.stringify({ email }) });
    const res = await POST(req as never);
    return { status: res.status, body: await res.json() };
  };
  const sentTo = (email: string) => ctx.outbox.filter((m) => m.to === email);

  const before = ctx.outbox.length;
  const unknown = await call("nobody@signin.example");
  assert.deepEqual(unknown, { status: 200, body: { ok: true } });
  assert.equal(ctx.outbox.length, before, "an unknown address gets nothing");

  assert.equal((await call("admin@signin.example")).status, 200);
  const a = sentTo("admin@signin.example");
  assert.equal(a.length, 1);
  assert.ok(a[0].html.includes("/api/biz/login/") && !a[0].html.includes("/adviser/login/"), "the administrator gets the administrator link");

  assert.equal((await call("adviser@signin.example")).status, 200);
  const d = sentTo("adviser@signin.example");
  assert.equal(d.length, 1);
  assert.ok(d[0].html.includes("/api/tapcard/adviser/login/") && !d[0].html.includes("/api/biz/login/"), "the adviser gets the adviser link");

  assert.equal((await call("both@signin.example")).status, 200);
  const both = sentTo("both@signin.example");
  assert.equal(both.length, 2, "someone who is both gets both links");
  assert.ok(both.some((m) => m.html.includes("/api/biz/login/")) && both.some((m) => m.html.includes("/api/tapcard/adviser/login/")));

  assert.equal((await call("not an email")).status, 400);
});
