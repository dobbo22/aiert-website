import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ctx, installStubs, sql } from "./helpers/pgdb";
installStubs({ realSession: true });

import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

const req = (url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
  new NextRequest(`https://tapcard.test${url}`, { method: init.method ?? "POST", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
const json = (r: Response) => r.json() as Promise<Record<string, any>>;
async function show(mod: () => Promise<{ default: (p?: never) => unknown }>, props?: unknown): Promise<string> {
  const tree = await ((await mod()).default as (p?: unknown) => unknown)(props);
  return renderToStaticMarkup(tree as never);
}
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");

async function setup() {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { createSessionCookie } = await import("../lib/tapcardBizAuth");
  const { createLocation } = await import("../lib/tapcardBizLocations");
  const org = await createManagedCompany({ name: `Mgr Co ${Math.random().toString(36).slice(2, 7)}`, adminEmail: `boss${Math.random().toString(36).slice(2, 7)}@mgr.example`, locations: 3 });
  const admin = ((await sql`SELECT email FROM tapcard_biz_admins WHERE org_id = ${org.id}`)[0] as { email: string }).email;
  const mk = (name: string, address: string) => createLocation(org.id, { name, address, phone: "01", email: "", website: "", links: [] });
  const dunmow = await mk("The Rose Garden", "16A High St, Great Dunmow, Dunmow CM6 1AG");
  const bardfield = await mk("The Rose Garden", "Braintree Rd, Great Bardfield, Braintree CM7 4PY");
  const asAdmin = () => { ctx.cookie = createSessionCookie(org.id, admin); };
  const asManager = (email: string) => { ctx.cookie = createSessionCookie(org.id, email); };
  return { org, admin, dunmow, bardfield, asAdmin, asManager };
}

test("an admin adds a manager for chosen shops, who is emailed what they can do", async () => {
  const t = await setup();
  const admins = await import("../app/api/tapcard/biz/admins/route");
  t.asAdmin();
  ctx.outbox.length = 0;
  const bad = [
    { email: "nope", role: "manager", locationIds: [t.dunmow.id] },
    { email: "mia@mgr.example", role: "manager", locationIds: [] },
    { email: "mia@mgr.example", role: "manager", locationIds: ["not-a-shop"] },
  ];
  assert.equal((await admins.POST(req("/api/biz/admins", { body: bad[0] }))).status, 400);
  assert.equal((await admins.POST(req("/api/biz/admins", { body: bad[1] }))).status, 400);
  assert.equal((await admins.POST(req("/api/biz/admins", { body: bad[2] }))).status, 400);
  const email = `mia${Math.random().toString(36).slice(2, 6)}@mgr.example`;
  assert.equal((await admins.POST(req("/api/biz/admins", { body: { email, role: "manager", locationIds: [t.dunmow.id] } }))).status, 200);
  assert.equal(ctx.outbox.length, 1);
  assert.equal(ctx.outbox[0].to, email);
  assert.match(ctx.outbox[0].subject, /manager at Mgr Co/);
  assert.match(ctx.outbox[0].html, /QR sign/);
  assert.match(ctx.outbox[0].html, /not part of your access/);
  assert.match(ctx.outbox[0].html, /login\//);
  assert.match(ctx.outbox[0].html, /Make your shop's card/, "the card link comes in the same email");
  assert.match(ctx.outbox[0].html, /business\/claim#/);
  assert.match(ctx.outbox[0].text, /Great Dunmow: https:\/\/tapcard\.aiert\.co\.uk\/business\/claim#/);
  const row = (await sql`SELECT role, location_ids FROM tapcard_biz_admins WHERE email = ${email}`)[0] as { role: string; location_ids: string[] };
  assert.equal(row.role, "manager");
  assert.deepEqual(row.location_ids, [t.dunmow.id]);
  // the link in the email builds the shop's finished card
  const claimToken = ctx.outbox[0].html.match(/business\/claim#([\w.-]+)/)![1];
  const claim = await import("../app/api/tapcard/biz/claim/route");
  assert.equal((await claim.POST(req("/api/biz/claim", { body: { token: claimToken } }))).status, 200);
  const made = (await sql`SELECT address, card_kind FROM tapcard_cards WHERE org_id = ${t.org.id}`)[0] as { address: string; card_kind: string };
  assert.equal(made.address, "16A High St, Great Dunmow, Dunmow CM6 1AG");
  assert.equal(made.card_kind, "business");
  assert.equal((await admins.POST(req("/api/biz/admins", { body: { email, role: "manager", locationIds: [t.dunmow.id] } }))).status, 409, "already added");
  // change their shops, then remove them
  const id = ((await sql`SELECT id FROM tapcard_biz_admins WHERE email = ${email}`)[0] as { id: string }).id;
  assert.equal((await admins.PATCH(req("/api/biz/admins", { method: "PATCH", body: { id, locationIds: [t.dunmow.id, t.bardfield.id] } }))).status, 200);
  assert.equal((await admins.PATCH(req("/api/biz/admins", { method: "PATCH", body: { id, locationIds: [] } }))).status, 400);
  const after = (await sql`SELECT location_ids FROM tapcard_biz_admins WHERE id = ${id}`)[0] as { location_ids: string[] };
  assert.equal(after.location_ids.length, 2);
  // managers are not counted as admins, and are not listed as admins
  const listed = await json(await admins.GET());
  assert.ok(!listed.admins.some((a: { email: string }) => a.email === email));
  assert.equal((await admins.DELETE(req(`/api/biz/admins?id=${id}`, { method: "DELETE" }))).status, 200);
  ctx.cookie = undefined;
});

test("a manager is closed out of every admin route and page, and cannot post offers", async () => {
  const t = await setup();
  const { addAdmin } = await import("../lib/tapcardBiz");
  const { requireBizSession, requireBizUser } = await import("../lib/tapcardBizSession");
  const email = "mgr@mgr.example";
  await addAdmin(t.org.id, email, "manager", [t.dunmow.id]);
  t.asManager(email);
  const user = await requireBizUser();
  assert.equal(user?.role, "manager");
  assert.deepEqual(user?.locationIds, [t.dunmow.id]);
  assert.equal(await requireBizSession(), null, "not an admin session");

  const call = async (mod: string, fn: string, r: NextRequest) => ((await import(mod)) as Record<string, (r: NextRequest, c?: unknown) => Promise<Response>>)[fn](r, { params: Promise.resolve({ id: "x", token: "x" }) });
  const denied: [string, string, NextRequest][] = [
    ["../app/api/tapcard/biz/template/route", "POST", req("/x", { body: { name: "Hack" } })],
    ["../app/api/tapcard/biz/locations/route", "POST", req("/x", { body: { hit: { name: "x" } } })],
    ["../app/api/tapcard/biz/locations/route", "PATCH", req("/x", { method: "PATCH", body: { id: t.dunmow.id, name: "x" } })],
    ["../app/api/tapcard/biz/locations/route", "DELETE", req(`/x?id=${t.dunmow.id}`, { method: "DELETE" })],
    ["../app/api/tapcard/biz/locations/route", "GET", req("/x", { method: "GET" })],
    ["../app/api/tapcard/biz/locations/discover/route", "POST", req("/x", { body: {} })],
    ["../app/api/tapcard/biz/admins/route", "POST", req("/x", { body: { email: "me@x.co" } })],
    ["../app/api/tapcard/biz/admins/route", "GET", req("/x", { method: "GET" })],
    ["../app/api/tapcard/biz/support/route", "POST", req("/x", { body: { allow: true } })],
    ["../app/api/tapcard/biz/find/route", "POST", req("/x", { body: { website: "x.com" } })],
    ["../app/api/tapcard/biz/logo/route", "DELETE", req("/x", { method: "DELETE" })],
  ];
  for (const [mod, fn, r] of denied) assert.equal((await call(mod, fn, r)).status, 401, `${mod} ${fn}`);

  // every admin page is empty for a manager
  for (const page of ["billing", "template", "locations", "admins", "promote"]) {
    assert.equal(await show(() => import(`../app/tapcard/business/admin/${page}/page`)), "", `${page} page`);
  }
  // offers and news: the posting routes are for admins and ticked phones only
  const offers = readdirSync(join(process.cwd(), "app/api/tapcard/cards/[id]")).filter((d) => ["offer", "announcement"].includes(d));
  assert.equal(offers.length, 2);
  ctx.cookie = undefined;
});

test("only the few manager routes use the manager-capable session", async () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = [...walk(join(process.cwd(), "app/api")), ...walk(join(process.cwd(), "app/tapcard/business"))].filter((f) => /\.(ts|tsx)$/.test(f));
  const users = files.filter((f) => readFileSync(f, "utf8").includes("requireBizUser")).map((f) => f.replace(process.cwd() + "/", "")).sort();
  assert.deepEqual(users, [
    "app/api/tapcard/biz/cards/[id]/route.ts",
    "app/api/tapcard/biz/invites/route.ts",
    "app/api/tapcard/biz/locations/sign/route.ts",
    // The public business search only reads who is signed in, to count the lookup against their company's daily allowance.
    "app/api/tapcard/business-search/route.ts",
    "app/tapcard/business/admin/employees/page.tsx",
    "app/tapcard/business/admin/layout.tsx",
    "app/tapcard/business/admin/page.tsx",
    "app/tapcard/business/admin/qr-sign/page.tsx",
  ]);
});

test("a manager: QR sign for their shop, invites and removes their shop's staff only", async () => {
  const t = await setup();
  const { addAdmin } = await import("../lib/tapcardBiz");
  const { signInvite, verifyInvite } = await import("../lib/tapcardBizInvite");
  const sign = await import("../app/api/tapcard/biz/locations/sign/route");
  const invites = await import("../app/api/tapcard/biz/invites/route");
  const claim = await import("../app/api/tapcard/biz/claim/route");
  const del = await import("../app/api/tapcard/biz/cards/[id]/route");
  const email = "mgr2@mgr.example";
  await addAdmin(t.org.id, email, "manager", [t.dunmow.id]);
  t.asManager(email);

  // QR sign wording: their shop yes, the other shop no
  const put = (id: string) => sign.PUT(req("/x", { method: "PUT", body: { id, sign: { headline: "Follow Dunmow" } } }));
  assert.equal((await put(t.dunmow.id)).status, 200);
  assert.equal((await put(t.bardfield.id)).status, 404);

  // staff invites: only for their own shop
  const people = [{ name: "Sam Staff", email: "sam@mgr.example", title: "Florist" }];
  const mk = (locationId?: string) => invites.POST(req("/x", { body: { people, locationId } }));
  assert.equal((await mk()).status, 403, "a shop is required");
  assert.equal((await mk(t.bardfield.id)).status, 403, "not their shop");
  assert.equal((await mk("not-a-shop")).status, 403);
  const ok = await mk(t.dunmow.id);
  assert.equal(ok.status, 200);
  const link = (await json(ok)).invites[0].link as string;
  assert.equal(verifyInvite(link.split("#")[1])!.s, t.dunmow.id);

  // the staff member claims: the card belongs to the shop
  const claimed = await claim.POST(req("/x", { body: { token: link.split("#")[1] } }));
  assert.equal(claimed.status, 200);
  const staff = (await sql`SELECT id, org_location_id FROM tapcard_cards WHERE org_id = ${t.org.id} AND name = 'Sam Staff'`)[0] as { id: string; org_location_id: string };
  assert.equal(staff.org_location_id, t.dunmow.id);

  // an invite for another company's shop does not tie to it
  const other = await setup();
  const odd = signInvite(t.org, { name: "Odd", email: "odd@x.co", title: "" }, Date.now(), undefined, other.dunmow.id);
  assert.equal((await claim.POST(req("/x", { body: { token: odd } }))).status, 200);
  assert.equal(((await sql`SELECT org_location_id FROM tapcard_cards WHERE org_id = ${t.org.id} AND name = 'Odd'`)[0] as { org_location_id: string | null }).org_location_id, null);

  // the manager's pages show only their staff and their shop
  const emp = text(await show(() => import("../app/tapcard/business/admin/employees/page")));
  assert.match(emp, /Your staff/);
  assert.match(emp, /Sam Staff/);
  assert.ok(!/Odd/.test(emp), "a card not tied to their shop is not theirs");
  assert.ok(!/Offers and news/.test(emp), "no posting controls");
  const home = text(await show(() => import("../app/tapcard/business/admin/page")));
  assert.match(home, /You manage this shop/);
  assert.match(home, /Great Dunmow/);
  assert.ok(!/Bardfield/.test(home));
  const qrPage = await import("../app/tapcard/business/admin/qr-sign/page");
  const qr = text(await show(() => Promise.resolve({ default: qrPage.default as never }), { searchParams: Promise.resolve({ shop: t.bardfield.id }) }));
  assert.match(qr, /Dunmow/);
  assert.ok(!/Bardfield/.test(qr), "only their own shop's sign");

  // removing: their staff yes; another shop's staff, a shop card, someone outside any shop: no
  const otherStaff = await (async () => {
    const tok = signInvite(t.org, { name: "Bardfield Staff", email: "b@x.co", title: "" }, Date.now(), undefined, t.bardfield.id);
    await claim.POST(req("/x", { body: { token: tok } }));
    return ((await sql`SELECT id FROM tapcard_cards WHERE org_id = ${t.org.id} AND name = 'Bardfield Staff'`)[0] as { id: string }).id;
  })();
  const rm = (id: string) => del.DELETE(req(`/x/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });
  assert.equal((await rm(otherStaff)).status, 404);
  const oddId = ((await sql`SELECT id FROM tapcard_cards WHERE org_id = ${t.org.id} AND name = 'Odd'`)[0] as { id: string }).id;
  assert.equal((await rm(oddId)).status, 404);
  await sql`UPDATE tapcard_cards SET card_kind = 'business' WHERE id = ${staff.id}`;
  assert.equal((await rm(staff.id)).status, 404, "a shop card is not staff");
  await sql`UPDATE tapcard_cards SET card_kind = 'person' WHERE id = ${staff.id}`;
  assert.equal((await rm(staff.id)).status, 200);
  assert.equal((await sql`SELECT id FROM tapcard_cards WHERE id = ${staff.id}`).length, 0);

  // an admin removes anything in the company
  t.asAdmin();
  assert.equal((await rm(otherStaff)).status, 200);
  ctx.cookie = undefined;
});

test("removing a manager signs them out; a manager's mailbox does not verify the company", async () => {
  const t = await setup();
  const { addAdmin, removeAdminById, listAdmins, orgHasConfirmedAdminOnDomain, confirmAdminEmail } = await import("../lib/tapcardBiz");
  const { requireBizUser } = await import("../lib/tapcardBizSession");
  await addAdmin(t.org.id, "mgr3@mgr.example", "manager", [t.dunmow.id]);
  t.asManager("mgr3@mgr.example");
  assert.equal((await requireBizUser())?.role, "manager");
  await confirmAdminEmail(t.org.id, "mgr3@mgr.example");
  assert.equal(await orgHasConfirmedAdminOnDomain(t.org.id, "mgr.example"), false, "only an admin proves the domain");
  await confirmAdminEmail(t.org.id, t.admin);
  assert.equal(await orgHasConfirmedAdminOnDomain(t.org.id, "mgr.example"), true);
  const id = (await listAdmins(t.org.id)).find((a) => a.email === "mgr3@mgr.example")!.id;
  await removeAdminById(t.org.id, id);
  assert.equal(await requireBizUser(), null);
  ctx.cookie = undefined;
});

test("the navigation shows a manager only QR sign and Employees (and Overview)", async () => {
  const AdminNav = (await import("../app/tapcard/business/admin/AdminNav")).default as (p: { role?: "admin" | "manager" }) => unknown;
  const manager = text(renderToStaticMarkup(AdminNav({ role: "manager" }) as never));
  assert.match(manager, /Overview/);
  assert.match(manager, /QR sign/);
  assert.match(manager, /Employees/);
  for (const hidden of ["Card template", "Locations", "Offers & numbers", "Admins", "Billing"]) assert.ok(!manager.includes(hidden), hidden);
  const admin = text(renderToStaticMarkup(AdminNav({ role: "admin" }) as never));
  for (const shown of ["Card template", "Locations", "Offers & numbers", "Admins", "Billing", "QR sign", "Employees"]) assert.ok(admin.includes(shown), shown);
});

test("an admin can tag an existing staff card with its shop, so that shop's manager sees it", async () => {
  const t = await setup();
  const { addAdmin } = await import("../lib/tapcardBiz");
  const cards = await import("../app/api/tapcard/biz/cards/[id]/route");
  const { createCard } = await import("../lib/tapcardDb");
  const { hashSecret } = await import("../lib/tapcardAuth");
  const { attachCardToOrg } = await import("../lib/tapcardBiz");
  const mkCard = async (name: string) => {
    const id = await createCard({ label: "Work", grouping_id: "", name, title: "", company: "Mgr Co", phone: "", email: `${name}@x.co`, website: "", address: "", linkedin_url: "", twitter_url: "", instagram_url: "", facebook_url: "", facebook_is_page: false, tiktok_url: "", whatsapp_url: "", photo_url: null } as never, hashSecret("t".repeat(40)), "ip");
    await attachCardToOrg(id, t.org.id, []);
    return id;
  };
  const old = await mkCard("OldStaff");
  const patch = (id: string, body: unknown) => cards.PATCH(req(`/x/${id}`, { method: "PATCH", body }), { params: Promise.resolve({ id }) });
  await addAdmin(t.org.id, "mgr4@mgr.example", "manager", [t.dunmow.id]);

  // a manager cannot tag cards
  t.asManager("mgr4@mgr.example");
  assert.equal((await patch(old, { locationId: t.dunmow.id })).status, 401);
  assert.ok(!text(await show(() => import("../app/tapcard/business/admin/employees/page"))).includes("OldStaff"));

  // an admin can, and then the manager sees the card
  t.asAdmin();
  assert.equal((await patch(old, { locationId: t.dunmow.id })).status, 200);
  assert.equal((await patch(old, {})).status, 400);
  assert.equal((await patch(old, { locationId: "not-a-shop" })).status, 404, "a shop that is not this company's");
  const other = await setup();
  assert.equal((await patch(old, { locationId: other.dunmow.id })).status, 404, "another company's shop");
  const adminPage = text(await show(() => import("../app/tapcard/business/admin/employees/page")));
  assert.match(adminPage, /OldStaff/);
  t.asManager("mgr4@mgr.example");
  assert.match(text(await show(() => import("../app/tapcard/business/admin/employees/page"))), /OldStaff/);

  // clearing it takes it away from the manager again; a shop card cannot be tagged as staff
  t.asAdmin();
  assert.equal((await patch(old, { locationId: null })).status, 200);
  t.asManager("mgr4@mgr.example");
  assert.ok(!text(await show(() => import("../app/tapcard/business/admin/employees/page"))).includes("OldStaff"));
  await sql`UPDATE tapcard_cards SET card_kind = 'business' WHERE id = ${old}`;
  t.asAdmin();
  assert.equal((await patch(old, { locationId: t.dunmow.id })).status, 404);
  ctx.cookie = undefined;
});

test("removing a made shop card puts the shop back to waiting, ready for a new invite link", async () => {
  const t = await setup();
  const { createLocation } = await import("../lib/tapcardBizLocations");
  const loc = await import("../app/api/tapcard/biz/locations/route");
  const claim = await import("../app/api/tapcard/biz/claim/route");
  const del = await import("../app/api/tapcard/biz/cards/[id]/route");
  void createLocation;
  t.asAdmin();
  ctx.session = null;
  const mk = async () => {
    const inv = await json(await loc.POST(req("/x", { body: { invite: { locationId: t.dunmow.id, name: "M", email: "m@x.co" } } })));
    return claim.POST(req("/x", { body: { token: inv.link.split("#")[1] } }));
  };
  assert.equal((await mk()).status, 200);
  const cardId = ((await sql`SELECT id FROM tapcard_cards WHERE org_id = ${t.org.id} AND card_kind = 'business'`)[0] as { id: string }).id;
  assert.equal((await loc.POST(req("/x", { body: { invite: { locationId: t.dunmow.id, name: "M", email: "m@x.co" } } }))).status, 409, "made: no second link");
  assert.equal((await del.DELETE(req(`/x/${cardId}`, { method: "DELETE" }), { params: Promise.resolve({ id: cardId }) })).status, 200);
  assert.equal((await mk()).status, 200, "a new link now builds a new card for the same shop");
  ctx.cookie = undefined;
});

test("a shop whose card is gone shows as waiting again, and removing the already-gone card works", async () => {
  const t = await setup();
  const loc = await import("../app/api/tapcard/biz/locations/route");
  const del = await import("../app/api/tapcard/biz/cards/[id]/route");
  t.asAdmin();
  // the shop points at a card that no longer exists (it was deleted some other way)
  await sql`UPDATE tapcard_biz_locations SET claimed_card_id = 'gone-card-id' WHERE id = ${t.dunmow.id}`;
  const listed = await json(await loc.GET());
  assert.equal(listed.locations.find((l: { id: string }) => l.id === t.dunmow.id).claimed, false, "no longer 'Card made'");
  await sql`UPDATE tapcard_biz_locations SET claimed_card_id = 'gone-card-id' WHERE id = ${t.bardfield.id}`;
  // pressing Remove on a card that is already gone succeeds and frees the shop
  const res = await del.DELETE(req("/x/gone-card-id", { method: "DELETE" }), { params: Promise.resolve({ id: "gone-card-id" }) });
  assert.equal(res.status, 200);
  assert.equal(((await sql`SELECT claimed_card_id FROM tapcard_biz_locations WHERE id = ${t.bardfield.id}`)[0] as { claimed_card_id: string | null }).claimed_card_id, null);
  // a card that was never anyone's is still a 404
  assert.equal((await del.DELETE(req("/x/nope", { method: "DELETE" }), { params: Promise.resolve({ id: "nope" }) })).status, 404);
  ctx.cookie = undefined;
});
