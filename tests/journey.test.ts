import { before, test } from "node:test";
import assert from "node:assert/strict";
import { ctx, installStubs, sql } from "./helpers/pgdb";
installStubs({ realSession: true });

import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

const req = (url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
  new NextRequest(`https://tapcard.test${url}`, { method: init.method ?? "POST", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
const json = (r: Response) => r.json() as Promise<Record<string, any>>;
// Renders a server page the way a signed-in admin sees it.
async function show(mod: () => Promise<{ default: (p?: never) => unknown }>, props?: unknown): Promise<string> {
  const page = (await mod()).default;
  const tree = await (page as (p?: unknown) => unknown)(props);
  return renderToStaticMarkup(tree as never);
}
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");

test("a business signs up, goes through every tab, and finds nothing broken", async () => {
  ctx.outbox.length = 0;

  // 1. Sign up for the free trial
  const trial = await import("../app/api/tapcard/biz/trial/route");
  const signup = await trial.POST(req("/api/tapcard/biz/trial", { body: { companyName: "Journey Cafe", email: "Owner@JourneyCafe.example", name: "Olly Owner" } }));
  assert.equal(signup.status, 200);
  assert.equal(ctx.outbox.length, 2, "a sign-in email and the welcome email");
  const login = ctx.outbox.find((m) => /Sign in/i.test(m.subject))!;
  const welcome = ctx.outbox.find((m) => /Welcome/i.test(m.subject))!;
  assert.equal(login.to, "owner@journeycafe.example");
  assert.match(welcome.html, /Hi Olly,/);
  assert.match(welcome.html, /own domain \(journeycafe\.example\)/);
  assert.match(welcome.html, /Steps 3 and 4/);
  // the same person cannot take a second trial
  const second = await trial.POST(req("/api/tapcard/biz/trial", { body: { companyName: "Journey Two", email: "other@journeycafe.example" } }));
  assert.equal(second.status, 409);

  // 2. Open the sign-in link (a page, then the button), which signs them in
  const token = login.html.match(/login\/([\w-]+)/)![1];
  const loginRoute = await import("../app/api/tapcard/biz/login/[token]/route");
  const landing = await loginRoute.GET();
  assert.match(await landing.text(), /Sign in to your admin/);
  const done = await loginRoute.POST(new NextRequest(`https://tapcard.test/api/biz/login/${token}`, { method: "POST" }), { params: Promise.resolve({ token }) });
  assert.equal(done.status, 303);
  ctx.cookie = (done.headers.get("set-cookie") ?? "").match(/tapcard_biz_admin=([^;]+)/)![1];
  const orgId = ((await sql`SELECT id FROM tapcard_biz_orgs WHERE name = 'Journey Cafe'`)[0] as { id: string }).id;

  // 3. Overview and billing as a trial
  let overview = text(await show(() => import("../app/tapcard/business/admin/page")));
  assert.match(overview, /Getting started/);
  assert.match(overview, /Set up your company details/);
  assert.match(overview, /Add your shops \(0 of 1\)/);
  let billing = text(await show(() => import("../app/tapcard/business/admin/billing/page")));
  assert.match(billing, /Free trial/);
  assert.match(billing, /Trial ends/);
  assert.match(billing, /How many locations/);

  // 4. Card template: save the company details, then the page shows them
  const template = await import("../app/api/tapcard/biz/template/route");
  assert.equal((await template.POST(req("/api/tapcard/biz/template", { body: { name: "Journey Cafe", website: "https://journeycafe.example", brandColor: "#aa3366", instagramURL: "https://instagram.com/journeycafe", facebookURL: "", lockedFields: ["company", "website"], allowsPersonalCards: true } }))).status, 200);
  const tpl = await show(() => import("../app/tapcard/business/admin/template/page"));
  assert.match(tpl, /Find your business/);
  assert.match(tpl, /Your shops/);
  assert.match(tpl, /journeycafe\.example/);
  assert.match(tpl, /#aa3366/);

  // 5. Locations: one allowed on a trial
  const locs = await import("../app/api/tapcard/biz/locations/route");
  const hit = { name: "Journey Cafe", address: "5 Market Place, Dunmow, CM6 1AB", phone: "01371 111111", website: "", hours: "Mon-Sat 8-5" };
  const added = await json(await locs.POST(req("/api/tapcard/biz/locations", { body: { hit } })));
  assert.ok(added.location.id);
  const refused = await locs.POST(req("/api/tapcard/biz/locations", { body: { hit: { ...hit, address: "2 Other St, Town, CM7 4PY" } } }));
  assert.equal(refused.status, 409);
  assert.match((await json(refused)).error, /1 location/);
  const locPage = text(await show(() => import("../app/tapcard/business/admin/locations/page")));
  assert.match(locPage, /Journey Cafe/);
  assert.match(locPage, /Waiting for its manager/);
  const tpl2 = await show(() => import("../app/tapcard/business/admin/template/page"));
  assert.match(tpl2, /Dunmow/, "the tab shows the town");

  // 6. QR sign: a sample until the card is made, with the wording we set
  const qrPage = await import("../app/tapcard/business/admin/qr-sign/page");
  const qr = await show(() => Promise.resolve({ default: qrPage.default as never }), { searchParams: Promise.resolve({ shop: added.location.id }) });
  assert.match(qr, /Finish setting up your card before making a QR sign/, "blocked until the card is made");
  assert.match(qr, /Journey Cafe is still waiting/);
  assert.ok(!/Scan to follow/.test(qr), "no sign editor yet");

  // 7. The manager gets the link and makes the card
  const inv = await json(await locs.POST(req("/api/tapcard/biz/locations", { body: { invite: { locationId: added.location.id, name: "Mia", email: "mia@journeycafe.example" } } })));
  const claim = await import("../app/api/tapcard/biz/claim/route");
  // (the claim comes from the phone: no admin cookie)
  const claimRes = await claim.POST(req("/api/biz/claim", { body: { token: inv.link.split("#")[1] } }));
  assert.equal(claimRes.status, 200);
  await sql`UPDATE tapcard_biz_orgs SET website = COALESCE(NULLIF(website, ''), 'https://journeycafe.example'), logo_url = COALESCE(NULLIF(logo_url, ''), 'https://journeycafe.example/logo.png') WHERE id = ${orgId}`;
  const qrAfter = await show(() => Promise.resolve({ default: qrPage.default as never }), { searchParams: Promise.resolve({ shop: added.location.id }) });
  assert.match(qrAfter, /Scan to follow and receive news and offers/, "card made: the sign opens");
  assert.ok(!/>Sample</.test(qrAfter));
  const made = await json(claimRes);
  assert.equal(made.card.orgID, orgId);
  const cardRow = (await sql`SELECT id, address, phone, card_kind FROM tapcard_cards WHERE org_id = ${orgId}`)[0] as Record<string, string>;
  assert.equal(cardRow.address, "5 Market Place, Dunmow, CM6 1AB");
  assert.equal(cardRow.card_kind, "business");

  // 8. Locations and QR sign now show it made, with its real QR link
  const locPage2 = text(await show(() => import("../app/tapcard/business/admin/locations/page")));
  assert.match(locPage2, /Card made/);
  const qr2 = await show(() => Promise.resolve({ default: qrPage.default as never }), { searchParams: Promise.resolve({ shop: added.location.id }) });
  assert.ok(!/>Sample</.test(qr2), "the card exists, so the sign is the real one");

  // 9. The admin moves the shop: the made card changes at once
  const patched = await locs.PATCH(req("/api/tapcard/biz/locations", { method: "PATCH", body: { id: added.location.id, name: "Journey Cafe", address: "Units 1 & 2, Craft Centre, Blake End", phone: "01371 222222", email: "hello@journeycafe.example" } }));
  assert.equal(patched.status, 200);
  const moved = (await sql`SELECT address, phone, org_overrides FROM tapcard_cards WHERE org_id = ${orgId}`)[0] as Record<string, string>;
  assert.equal(moved.address, "Units 1 & 2, Craft Centre, Blake End");
  assert.equal(moved.phone, "01371 222222");
  assert.match(moved.org_overrides, /Blake End/);

  // 10. Employees, Offers and numbers, Admins render with the card in them
  const employees = text(await show(() => import("../app/tapcard/business/admin/employees/page")));
  assert.match(employees, /Active cards/);
  assert.match(employees, /1 of 1 cards used/);
  const promote = text(await show(() => import("../app/tapcard/business/admin/promote/page")));
  assert.ok(promote.length > 50);
  const admins = text(await show(() => import("../app/tapcard/business/admin/admins/page")));
  assert.match(admins, /owner@journeycafe\.example/);
  assert.match(admins, /AIERT support access/);
  assert.match(admins, /Not allowed/);

  // 11. A second admin, and the company's own support switch
  const adminsApi = await import("../app/api/tapcard/biz/admins/route");
  ctx.outbox.length = 0;
  assert.equal((await adminsApi.POST(req("/api/tapcard/biz/admins", { body: { email: "colleague@journeycafe.example" } }))).status, 200);
  assert.equal(ctx.outbox.length, 1);
  assert.match(ctx.outbox[0].subject, /admin of Journey Cafe/);
  const support = await import("../app/api/tapcard/biz/support/route");
  const on = await json(await support.POST(req("/api/tapcard/biz/support", { body: { allow: true } })));
  assert.ok(on.until);
  assert.match(text(await show(() => import("../app/tapcard/business/admin/admins/page"))), /Allowed until/);
  await support.POST(req("/api/tapcard/biz/support", { body: { allow: false } }));

  // 12. They choose a plan: the Stripe webhook's effect on the company, the billing page and the welcome email
  const { setOrgBilling, claimWelcomeEmail } = await import("../lib/tapcardBiz");
  await setOrgBilling(orgId, { billing_status: "active", seat_band: "locations", locations: 3, seat_limit: 33, stripe_customer_id: "cus_test", stripe_subscription_id: "sub_test", current_period_end: new Date("2027-10-28T00:00:00Z") });
  billing = text(await show(() => import("../app/tapcard/business/admin/billing/page")));
  assert.match(billing, /3 locations/);
  assert.match(billing, /Renews 28\/10\/2027/);
  assert.ok(!/How many locations/.test(billing), "a paying company is not asked to choose a plan again");
  assert.equal(await claimWelcomeEmail(orgId, "paid"), true, "the paid welcome is still to send");
  assert.equal(await claimWelcomeEmail(orgId, "paid"), false);
  overview = text(await show(() => import("../app/tapcard/business/admin/page")));
  assert.match(overview, /3 \/ 33|1 \/ 33/);

  // 13. Signed out: every admin page is empty and every API refuses
  ctx.cookie = undefined;
  assert.equal(await show(() => import("../app/tapcard/business/admin/page")), "");
  assert.equal((await locs.POST(req("/api/tapcard/biz/locations", { body: { hit } }))).status, 401);
  assert.equal((await template.POST(req("/api/tapcard/biz/template", { body: {} }))).status, 401);
});

test("a company set up free by AIERT shows free on its billing page and overview", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { createSessionCookie } = await import("../lib/tapcardBizAuth");
  const org = await createManagedCompany({ name: "Rose Journey", adminEmail: "info@rosejourney.example", locations: 3 });
  ctx.cookie = createSessionCookie(org.id, "info@rosejourney.example");
  const billing = text(await show(() => import("../app/tapcard/business/admin/billing/page")));
  assert.match(billing, /Free, 3 locations/);
  assert.match(billing, /Nothing to pay/);
  assert.match(billing, /free access, set up by AIERT/i);
  assert.ok(!/Continue to payment|How many locations/.test(billing));
  const overview = text(await show(() => import("../app/tapcard/business/admin/page")));
  assert.match(overview, /Free access/);
  assert.match(overview, /Add your shops \(0 of 3\)/);
  const { isComplimentary, getOrg } = await import("../lib/tapcardBiz");
  assert.equal(isComplimentary((await getOrg(org.id))!), true);
  // a paying company is never "free", nor a trial
  assert.equal(isComplimentary({ seat_band: "locations", billing_status: "active", stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1", current_period_end: null } as never), false);
  assert.equal(isComplimentary({ seat_band: "trial", billing_status: "active", stripe_subscription_id: null, stripe_customer_id: null, current_period_end: null } as never), false);
  ctx.cookie = undefined;
});
