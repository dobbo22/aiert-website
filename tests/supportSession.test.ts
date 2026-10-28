import { before, test } from "node:test";
import assert from "node:assert/strict";
import { ctx, installStubs } from "./helpers/pgdb";
installStubs({ realSession: true });

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

test("a company admin's session needs them to still be an admin", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { createSessionCookie } = await import("../lib/tapcardBizAuth");
  const { requireBizSession } = await import("../lib/tapcardBizSession");
  const org = await createManagedCompany({ name: "Session Co", adminEmail: "boss@session.example", locations: 2 });
  ctx.cookie = createSessionCookie(org.id, "boss@session.example");
  assert.deepEqual(await requireBizSession(), { orgId: org.id, email: "boss@session.example" });
  ctx.cookie = createSessionCookie(org.id, "stranger@session.example");
  assert.equal(await requireBizSession(), null, "not an admin of this company");
  ctx.cookie = createSessionCookie("another-org", "boss@session.example");
  assert.equal(await requireBizSession(), null);
  ctx.cookie = "garbage";
  assert.equal(await requireBizSession(), null);
  ctx.cookie = undefined;
  assert.equal(await requireBizSession(), null);
});

test("a support session works only while the company's own window is open, and is marked as support", async () => {
  const { createManagedCompany, setSupportAccess, SUPPORT_PREFIX, SUPPORT_SESSION_MS } = await import("../lib/tapcardBizSupport");
  const { createSessionCookie } = await import("../lib/tapcardBizAuth");
  const { requireBizSession } = await import("../lib/tapcardBizSession");
  const org = await createManagedCompany({ name: "Support Co", adminEmail: "boss@support.example", locations: 2 });
  ctx.cookie = createSessionCookie(org.id, `${SUPPORT_PREFIX}martin@aiert.co.uk`, SUPPORT_SESSION_MS);
  const s = await requireBizSession();
  assert.equal(s?.support, true);
  assert.equal(s?.orgId, org.id);
  // the company switches it off: the very next request is refused
  await setSupportAccess(org.id, null, "boss@support.example");
  assert.equal(await requireBizSession(), null);
  // switched on again
  await setSupportAccess(org.id, 7, "boss@support.example");
  assert.equal((await requireBizSession())?.support, true);
  // a support cookie for a company that never allowed it (an ordinary company) is refused
  const plain = await createManagedCompany({ name: "Plain Co", adminEmail: "a@plain.example", locations: 2 });
  await setSupportAccess(plain.id, null, "a@plain.example");
  ctx.cookie = createSessionCookie(plain.id, `${SUPPORT_PREFIX}martin@aiert.co.uk`, SUPPORT_SESSION_MS);
  assert.equal(await requireBizSession(), null);
  // an expired support cookie is refused even with the window open
  ctx.cookie = createSessionCookie(org.id, `${SUPPORT_PREFIX}martin@aiert.co.uk`, -1000);
  assert.equal(await requireBizSession(), null);
  // a tampered cookie (another company id) fails its signature
  const good = createSessionCookie(org.id, `${SUPPORT_PREFIX}martin@aiert.co.uk`, SUPPORT_SESSION_MS);
  const parts = good.split(".");
  parts[0] = plain.id;
  ctx.cookie = parts.join(".");
  assert.equal(await requireBizSession(), null);
  ctx.cookie = undefined;
});

test("the support login link: single use, short cookie, refused when the window is closed", async () => {
  const { createManagedCompany, setSupportAccess, SUPPORT_PREFIX } = await import("../lib/tapcardBizSupport");
  const { createLoginToken } = await import("../lib/tapcardBizAuth");
  const { POST } = await import("../app/api/tapcard/biz/login/[token]/route");
  const { NextRequest } = await import("next/server");
  const org = await createManagedCompany({ name: "Link Co", adminEmail: "boss@link.example", locations: 2 });
  const token = await createLoginToken(`${SUPPORT_PREFIX}martin@aiert.co.uk`, org.id);
  const post = (t: string) => POST(new NextRequest(`https://tapcard.test/api/biz/login/${t}`, { method: "POST" }), { params: Promise.resolve({ token: t }) });
  const ok = await post(token);
  assert.equal(ok.status, 303);
  const cookie = ok.headers.get("set-cookie") ?? "";
  assert.match(cookie, /tapcard_biz_admin=/);
  assert.match(cookie, /Max-Age=7200/);
  assert.match(ok.headers.get("location") ?? "", /\/business\/admin$/);
  assert.match((await post(token)).headers.get("location") ?? "", /error=expired/, "used once");
  // window closed after the link was made: refused, no cookie
  const t2 = await createLoginToken(`${SUPPORT_PREFIX}martin@aiert.co.uk`, org.id);
  await setSupportAccess(org.id, null, "boss@link.example");
  const refused = await post(t2);
  assert.match(refused.headers.get("location") ?? "", /error=expired/);
  assert.ok(!(refused.headers.get("set-cookie") ?? "").includes("tapcard_biz_admin"));
  // an ordinary admin link still gets the 30 day cookie
  const t3 = await createLoginToken("boss@link.example", org.id);
  assert.match((await post(t3)).headers.get("set-cookie") ?? "", /Max-Age=2592000/);
});

test("support sessions cannot change billing or admins", async () => {
  const { createManagedCompany, SUPPORT_PREFIX, SUPPORT_SESSION_MS } = await import("../lib/tapcardBizSupport");
  const { createSessionCookie } = await import("../lib/tapcardBizAuth");
  const { NextRequest } = await import("next/server");
  const org = await createManagedCompany({ name: "Locked Co", adminEmail: "boss@locked.example", locations: 2 });
  ctx.cookie = createSessionCookie(org.id, `${SUPPORT_PREFIX}martin@aiert.co.uk`, SUPPORT_SESSION_MS);
  const r = (url: string, method: string, body?: unknown) => new NextRequest(`https://tapcard.test${url}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json" } });
  process.env.TAPCARD_BIZ_PRICE_LOCATION = "price_test";
  const checkout = await import("../app/api/tapcard/biz/checkout/route");
  assert.equal((await checkout.POST(r("/api/biz/checkout", "POST", { locations: 3 }))).status, 403);
  const portal = await import("../app/api/tapcard/biz/billing-portal/route");
  assert.equal((await portal.POST()).status, 403);
  const admins = await import("../app/api/tapcard/biz/admins/route");
  assert.equal((await admins.POST(r("/api/biz/admins", "POST", { email: "me@aiert.co.uk" }))).status, 403);
  assert.equal((await admins.DELETE(r("/api/biz/admins?id=x", "DELETE"))).status, 403);
  const support = await import("../app/api/tapcard/biz/support/route");
  assert.equal((await support.POST(r("/api/biz/support", "POST", { allow: true }))).status, 401, "support cannot grant itself access");
  ctx.cookie = undefined;
});
