import { before, test } from "node:test";
import assert from "node:assert/strict";
import { ctx, installStubs, sql } from "./helpers/pgdb";
installStubs();

import { NextRequest } from "next/server";

// The company tables add columns to tapcard_cards, so the cards table must exist first (it always does in production).
before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

const json = (r: Response) => r.json() as Promise<Record<string, any>>;
const req = (url: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
  new NextRequest(`https://tapcard.test${url}`, { method: init.method ?? "POST", body: init.body === undefined ? undefined : JSON.stringify(init.body), headers: { "content-type": "application/json", ...(init.headers ?? {}) } });

async function newCard(token: string, over: Record<string, unknown> = {}) {
  const { createCard } = await import("../lib/tapcardDb");
  const { hashSecret } = await import("../lib/tapcardAuth");
  return createCard({
    label: "Business", grouping_id: "", name: "Corner Cafe", title: "", company: "Corner Cafe", phone: "01234 567890", email: "hi@corner.test", website: "", address: "1 High St",
    linkedin_url: "", twitter_url: "", instagram_url: "", facebook_url: "", facebook_is_page: false, tiktok_url: "", whatsapp_url: "", photo_url: null, ...over,
  } as never, hashSecret(token), "iphash");
}

test("managed company: free for N locations, admin added, support window open and closable", async () => {
  const { createManagedCompany, supportAccessOpen, setSupportAccess } = await import("../lib/tapcardBizSupport");
  const { getOrg, isOrgActive, listAdmins } = await import("../lib/tapcardBiz");
  const org = await createManagedCompany({ name: "The Rose Garden", adminEmail: "Info@RoseGarden.example", locations: 3 });
  const fresh = (await getOrg(org.id))!;
  assert.equal(fresh.seat_band, "locations");
  assert.equal(fresh.locations, 3);
  assert.equal(fresh.seat_limit, 33);
  assert.equal(fresh.current_period_end, null);
  assert.equal(isOrgActive(fresh), true);
  assert.equal(fresh.domain, "rosegarden.example");
  assert.deepEqual((await listAdmins(org.id)).map((a) => a.email), ["info@rosegarden.example"]);
  assert.equal(await supportAccessOpen(org.id), true);
  await setSupportAccess(org.id, null, "test");
  assert.equal(await supportAccessOpen(org.id), false);
  // A shared mailbox gives the company no domain.
  const gmail = await createManagedCompany({ name: "Gmail Co", adminEmail: "owner@gmail.com", locations: 1 });
  assert.equal((await getOrg(gmail.id))!.domain, "");
});

test("support access can only be raised to 90 days and every change is logged", async () => {
  const { createManagedCompany, setSupportAccess, supportAccessUntil, recentSupportLog } = await import("../lib/tapcardBizSupport");
  const org = await createManagedCompany({ name: "Cap Co", adminEmail: "a@cap.example", locations: 2 });
  await setSupportAccess(org.id, 5000, "tester");
  const until = (await supportAccessUntil(org.id))!;
  const days = (until.getTime() - Date.now()) / 86_400_000;
  assert.ok(days > 89 && days <= 90.01, `days=${days}`);
  const log = await recentSupportLog(50);
  assert.ok(log.some((l) => l.org_id === org.id && l.actor === "tester"));
});

test("welcome email is claimed once per stage", async () => {
  const { createOrg, claimWelcomeEmail } = await import("../lib/tapcardBiz");
  const org = await createOrg("Welcome Co", "");
  assert.equal(await claimWelcomeEmail(org.id, "trial"), true);
  assert.equal(await claimWelcomeEmail(org.id, "trial"), false);
  assert.equal(await claimWelcomeEmail(org.id, "paid"), true);
  assert.equal(await claimWelcomeEmail(org.id, "paid"), false);
});

test("claim: a new card from an invite, and the invite works once", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { signInvite } = await import("../lib/tapcardBizInvite");
  const { POST } = await import("../app/api/tapcard/biz/claim/route");
  const org = await createManagedCompany({ name: "Claim Co", adminEmail: "a@claim.example", locations: 2 });
  const token = signInvite(org, { name: "Sam Patel", email: "sam@claim.example", title: "Manager" });
  const r1 = await POST(req("/api/biz/claim", { body: { token } }));
  assert.equal(r1.status, 200);
  const b1 = await json(r1);
  assert.equal(b1.card.name, "Sam Patel");
  assert.equal(b1.card.orgID, org.id);
  assert.ok(b1.editToken.length > 20);
  const r2 = await POST(req("/api/biz/claim", { body: { token } }));
  assert.equal(r2.status, 409);
  assert.equal((await POST(req("/api/biz/claim", { body: { token: "garbage" } }))).status, 404);
});

test("claim: seat limit and billing are enforced", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { signInvite } = await import("../lib/tapcardBizInvite");
  const { POST } = await import("../app/api/tapcard/biz/claim/route");
  const org = await createManagedCompany({ name: "Tiny Co", adminEmail: "a@tiny.example", locations: 1 });
  await sql`UPDATE tapcard_biz_orgs SET seat_limit = 1 WHERE id = ${org.id}`;
  assert.equal((await POST(req("/api/biz/claim", { body: { token: signInvite(org, { name: "A", email: "a@x", title: "" }) } }))).status, 200);
  assert.equal((await POST(req("/api/biz/claim", { body: { token: signInvite(org, { name: "B", email: "b@x", title: "" }) } }))).status, 402);
  const paused = await createManagedCompany({ name: "Paused Co", adminEmail: "a@paused.example", locations: 2 });
  await sql`UPDATE tapcard_biz_orgs SET billing_status = 'canceled' WHERE id = ${paused.id}`;
  assert.equal((await POST(req("/api/biz/claim", { body: { token: signInvite(paused, { name: "C", email: "c@x", title: "" }) } }))).status, 402);
});

test("locations: add, limit, edit, invite, claim builds the finished shop card", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { verifyInvite } = await import("../lib/tapcardBizInvite");
  const { getCard } = await import("../lib/tapcardDb");
  const loc = await import("../app/api/tapcard/biz/locations/route");
  const { POST: claim } = await import("../app/api/tapcard/biz/claim/route");
  const org = await createManagedCompany({ name: "Shops Ltd", adminEmail: "a@shops.example", locations: 2 });
  ctx.session = { orgId: org.id, email: "a@shops.example" };

  const hit = { name: "Shops Ltd", address: "16A High St, Great Dunmow, CM6 1AG", phone: "+44 1371 872882", website: "", hours: "Mon-Fri 9-5" };
  const a = await json(await loc.POST(req("/api/tapcard/biz/locations", { body: { hit } })));
  assert.ok(a.location?.id, JSON.stringify(a));
  assert.ok(a.location.links.some((l: { kind: string }) => l.kind === "hours"), "Google hours become an hours link");
  const b = await json(await loc.POST(req("/api/tapcard/biz/locations", { body: { hit: { ...hit, address: "Braintree Rd, Great Bardfield, CM7 4PY", phone: "+44 1371 811102" } } })));
  assert.ok(b.location?.id);
  const over = await loc.POST(req("/api/tapcard/biz/locations", { body: { hit: { ...hit, name: "Third" } } }));
  assert.equal(over.status, 409, "plan limit of 2 locations");

  // edit before it is claimed (the shop moves)
  const edited = await loc.PATCH(req("/api/tapcard/biz/locations", { method: "PATCH", body: { id: b.location.id, name: "Shops Ltd", address: "Units 15A & 15B, Blake House Craft Centre, Blake End", phone: "+44 1371 811102", email: "bardfield@shops.example" } }));
  assert.equal(edited.status, 200);
  const list = await json(await loc.GET());
  assert.equal(list.locations.find((l: { id: string }) => l.id === b.location.id).address, "Units 15A & 15B, Blake House Craft Centre, Blake End");

  // manager invite carries the location, and claiming builds the finished card
  const inv = await json(await loc.POST(req("/api/tapcard/biz/locations", { body: { invite: { locationId: b.location.id, name: "Jo", email: "jo@shops.example" } } })));
  const token = inv.link.split("#")[1];
  assert.equal(verifyInvite(token)!.l, b.location.id);
  const claimed = await json(await claim(req("/api/biz/claim", { body: { token } })));
  void getCard;
  const card = (await sql`SELECT * FROM tapcard_cards WHERE org_id = ${org.id} ORDER BY created_at DESC LIMIT 1`)[0] as Record<string, any>;
  void claimed;
  assert.equal(card.address, "Units 15A & 15B, Blake House Craft Centre, Blake End");
  assert.equal(card.phone, "+44 1371 811102");
  assert.equal(card.email, "bardfield@shops.example");
  assert.equal(card.card_kind, "business");
  assert.deepEqual((card as never as { org_posts_for: string[] }).org_posts_for, [], "a manager cannot post offers unless an admin ticks it");
  assert.ok(JSON.parse(card.links).some((l: { kind: string }) => l.kind === "hours"));

  // a made location can no longer be removed as a prepared one, and cannot be invited again
  assert.equal((await loc.DELETE(req(`/api/tapcard/biz/locations?id=${b.location.id}`, { method: "DELETE" }))).status, 404);
  const again = await loc.POST(req("/api/tapcard/biz/locations", { body: { invite: { locationId: b.location.id, name: "X", email: "x@x" } } }));
  assert.equal(again.status, 409);
  // an unclaimed one can be removed
  assert.equal((await loc.DELETE(req(`/api/tapcard/biz/locations?id=${a.location.id}`, { method: "DELETE" }))).status, 200);
  // another company cannot touch it
  ctx.session = { orgId: "someone-else", email: "z@z" };
  assert.equal((await loc.PATCH(req("/api/tapcard/biz/locations", { method: "PATCH", body: { id: a.location.id, name: "Hijack" } }))).status, 409);
  ctx.session = null;
});

test("admin changes to a made card cannot be overwritten by a phone's older copy", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { setCardOverrides, applyOrgLocks, getCardOverrides, attachCardToOrg } = await import("../lib/tapcardBiz");
  const { getCard } = await import("../lib/tapcardDb");
  const org = await createManagedCompany({ name: "Move Co", adminEmail: "a@move.example", locations: 2 });
  const cardId = await newCard("tok-move-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  await attachCardToOrg(cardId, org.id, org.locked_fields);
  const r = await setCardOverrides(org.id, cardId, { address: "New Place, Blake End", phone: "  0777 000  " });
  assert.equal(r!.before.address, "1 High St");
  assert.equal(r!.after.phone, "0777 000");
  const card = (await getCard(cardId))!;
  assert.equal(card.address, "New Place, Blake End");
  // the phone later saves its old copy: the admin's values win, the rest is the phone's
  const saved = await applyOrgLocks(card as never, { name: "Corner Cafe", address: "1 High St", phone: "01234 567890", email: "me@x.test", title: "t" });
  assert.equal(saved.address, "New Place, Blake End");
  assert.equal(saved.phone, "0777 000");
  assert.equal(saved.email, "me@x.test");
  assert.deepEqual(await getCardOverrides(cardId), { address: "New Place, Blake End", phone: "0777 000" });
  // not another company's card, and not a card outside any company
  assert.equal(await setCardOverrides("other-org", cardId, { address: "x" }), null);
  const lone = await newCard("tok-lone-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  assert.equal(await setCardOverrides(org.id, lone, { address: "x" }), null);
});

test("the owner's app can read the admin's changes, nobody else can", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { setCardOverrides, attachCardToOrg } = await import("../lib/tapcardBiz");
  const { GET } = await import("../app/api/tapcard/biz/card-overrides/[id]/route");
  const org = await createManagedCompany({ name: "Read Co", adminEmail: "a@read.example", locations: 2 });
  const id = await newCard("tok-read-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  await attachCardToOrg(id, org.id, []);
  await setCardOverrides(org.id, id, { address: "Elsewhere" });
  const ok = await GET(req(`/x/${id}`, { method: "GET", headers: { authorization: "Bearer tok-read-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } }), { params: Promise.resolve({ id }) });
  assert.deepEqual((await json(ok)).overrides, { address: "Elsewhere" });
  assert.equal((await GET(req(`/x/${id}`, { method: "GET" }), { params: Promise.resolve({ id }) })).status, 403);
  // once the owner's app confirms it has applied them, the manager's own later edits stick again
  const { DELETE } = await import("../app/api/tapcard/biz/card-overrides/[id]/route");
  const { applyOrgLocks } = await import("../lib/tapcardBiz");
  const { getCard } = await import("../lib/tapcardDb");
  assert.equal((await DELETE(req(`/x/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) })).status, 403, "only the owner");
  assert.equal((await DELETE(req(`/x/${id}`, { method: "DELETE", headers: { authorization: "Bearer tok-read-" + "x".repeat(40) } }), { params: Promise.resolve({ id }) })).status, 200);
  assert.deepEqual((await json(await GET(req(`/x/${id}`, { method: "GET", headers: { authorization: "Bearer tok-read-" + "x".repeat(40) } }), { params: Promise.resolve({ id }) }))).overrides, {});
  const later = await applyOrgLocks((await getCard(id)) as never, { name: "n", address: "Manager typed this", phone: "p", email: "e" });
  assert.equal(later.address, "Manager typed this");
  assert.equal((await GET(req(`/x/${id}`, { method: "GET", headers: { authorization: "Bearer wrong-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } }), { params: Promise.resolve({ id }) })).status, 403);
});

test("use my existing card: joins the company with the same id; refused when it should be", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { signInvite } = await import("../lib/tapcardBizInvite");
  const { cardOrgId, attachCardToOrg } = await import("../lib/tapcardBiz");
  const { POST } = await import("../app/api/tapcard/biz/claim/route");
  const org = await createManagedCompany({ name: "Join Co", adminEmail: "a@join.example", locations: 3 });
  const invite = () => signInvite(org, { name: "Pat", email: "pat@join.example", title: "" });

  const mine = await newCard("tok-mine-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const bad = await POST(req("/api/biz/claim", { body: { token: invite(), existingCardId: mine }, headers: { authorization: "Bearer not-mine-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } }));
  assert.equal(bad.status, 403, "wrong edit token");
  const none = await POST(req("/api/biz/claim", { body: { token: invite(), existingCardId: mine } }));
  assert.equal(none.status, 403, "no edit token");

  const personal = await newCard("tok-pers-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", { label: "Personal" });
  assert.equal((await POST(req("/api/biz/claim", { body: { token: invite(), existingCardId: personal }, headers: { authorization: "Bearer tok-pers-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } }))).status, 400);
  const person = await newCard("tok-pers-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxon");
  await sql`UPDATE tapcard_cards SET card_kind = 'person' WHERE id = ${person}`;
  assert.equal((await POST(req("/api/biz/claim", { body: { token: invite(), existingCardId: person }, headers: { authorization: "Bearer tok-pers-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxon" } }))).status, 400);

  const ok = await POST(req("/api/biz/claim", { body: { token: invite(), existingCardId: mine }, headers: { authorization: "Bearer tok-mine-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } }));
  assert.equal(ok.status, 200);
  const body = await json(ok);
  assert.equal(body.card.orgID, org.id);
  assert.equal(body.editToken, "", "its own token carries on");
  assert.equal(await cardOrgId(mine), org.id);

  // already in a company: refused (and the invite is not spent by the refusal)
  const spendBefore = invite();
  assert.equal((await POST(req("/api/biz/claim", { body: { token: spendBefore, existingCardId: mine }, headers: { authorization: "Bearer tok-mine-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } }))).status, 409);
  assert.equal((await POST(req("/api/biz/claim", { body: { token: spendBefore } }))).status, 200, "the invite still works for a new card");

  // a card another company already holds cannot be taken
  const other = await createManagedCompany({ name: "Other Co", adminEmail: "a@other.example", locations: 2 });
  const held = await newCard("tok-held-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  await attachCardToOrg(held, other.id, []);
  assert.equal((await POST(req("/api/biz/claim", { body: { token: invite(), existingCardId: held }, headers: { authorization: "Bearer tok-held-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } }))).status, 409);
});

test("AIERT companies page API: needs the admin login and the company's support window", async () => {
  const { createManagedCompany, setSupportAccess } = await import("../lib/tapcardBizSupport");
  const { getOrg } = await import("../lib/tapcardBiz");
  const { verifyInvite } = await import("../lib/tapcardBizInvite");
  void verifyInvite;
  const { POST } = await import("../app/api/admin/tapcard/companies/route");
  ctx.admin = false;
  assert.equal((await POST(req("/api/admin/tapcard/companies", { body: { action: "create", name: "X", adminEmail: "a@b.co" } }))).status, 401);
  ctx.admin = true;
  assert.equal((await POST(req("/api/admin/tapcard/companies", { body: { action: "create", name: "", adminEmail: "bad" } }))).status, 400);
  const made = await json(await POST(req("/api/admin/tapcard/companies", { body: { action: "create", name: "Rose Test", adminEmail: "info@rose.example", locations: 3 } })));
  assert.ok(made.orgId);
  // consent open (30 days, set on creation): opening works and gives a one-time link
  const opened = await json(await POST(req("/api/admin/tapcard/companies", { body: { action: "open", orgId: made.orgId } })));
  assert.match(opened.url, /^https:\/\/tapcard\.aiert\.co\.uk\/api\/biz\/login\/[\w-]+$/);
  // the company turns it off: refused
  await setSupportAccess(made.orgId, null, "company");
  assert.equal((await POST(req("/api/admin/tapcard/companies", { body: { action: "open", orgId: made.orgId } }))).status, 403);
  assert.equal((await POST(req("/api/admin/tapcard/companies", { body: { action: "free", orgId: made.orgId, locations: 5 } }))).status, 403);
  await setSupportAccess(made.orgId, 7, "company");
  assert.equal((await POST(req("/api/admin/tapcard/companies", { body: { action: "free", orgId: made.orgId, locations: 5 } }))).status, 200);
  const o = (await getOrg(made.orgId))!;
  assert.equal(o.locations, 5);
  assert.equal(o.seat_limit, 55);
  assert.equal((await POST(req("/api/admin/tapcard/companies", { body: { action: "open", orgId: "nope" } }))).status, 404);
});

test("welcome email: personal, escaped, right for trial and paid", async () => {
  const { buildBizWelcomeEmail } = await import("../lib/tapcardBizEmail");
  const trial = buildBizWelcomeEmail("sam@therosegarden.example", "The <b>Rose</b> & Co", { kind: "trial", endsOn: "27 November 2026", name: "Sam <i>Patel</i>" });
  assert.match(trial.html, /Hi Sam,/);
  assert.ok(!trial.html.includes("<b>Rose</b>"), "company name is escaped");
  assert.ok(!trial.html.includes("<i>"), "name is escaped");
  assert.match(trial.html, /27 November 2026/);
  assert.match(trial.html, /own domain \(therosegarden\.example\)/);
  assert.match(trial.text, /Steps 3 and 4/);
  const paid = buildBizWelcomeEmail("owner@gmail.com", "Cafe", { kind: "paid", locations: 3 });
  assert.match(paid.html, /Hello,/);
  assert.match(paid.html, /3 locations/);
  assert.match(paid.html, /Admins<\/strong> tab/);
  assert.ok(!/Steps 3 and 4/.test(paid.text));
  const nasty = buildBizWelcomeEmail("a@<script>x</script>.co", "C", { kind: "paid", locations: 2 });
  assert.ok(!nasty.html.includes("<script>"), "an address with markup in it is escaped in the HTML");
});

test("QR sign: wording is saved per shop, cleaned, and only by that company", async () => {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { parseSign, DEFAULT_SIGN } = await import("../lib/tapcardBizLocations");
  const loc = await import("../app/api/tapcard/biz/locations/route");
  const sign = await import("../app/api/tapcard/biz/locations/sign/route");
  const org = await createManagedCompany({ name: "Sign Co", adminEmail: "a@sign.example", locations: 2 });
  ctx.session = { orgId: org.id, email: "a@sign.example" };
  const made = await json(await loc.POST(req("/api/tapcard/biz/locations", { body: { hit: { name: "Sign Co", address: "1 High St, Town, AB1 2CD", phone: "01", website: "", hours: "" } } })));
  const id = made.location.id;
  const put = (body: unknown) => sign.PUT(req("/api/tapcard/biz/locations/sign", { method: "PUT", body }));
  assert.equal((await put({ id, sign: { headline: "Follow us!", line: "Sign Co Town", footer: "x".repeat(500), showLogo: false, showSocials: true, showApp: false } })).status, 200);
  const row = (await sql`SELECT sign FROM tapcard_biz_locations WHERE id = ${id}`)[0] as { sign: string };
  const saved = parseSign(row.sign);
  assert.equal(saved.headline, "Follow us!");
  assert.equal(saved.footer.length, 120, "long text is cut");
  assert.equal(saved.showLogo, false);
  assert.equal(saved.showSocials, true);
  // a blank headline falls back to the standard one; junk is ignored
  assert.equal(parseSign('{"headline":"  "}').headline, DEFAULT_SIGN.headline);
  assert.deepEqual(parseSign("not json"), DEFAULT_SIGN);
  assert.equal((await put({ id: "missing", sign: {} })).status, 404);
  assert.equal((await put({ id })).status, 400);
  ctx.session = { orgId: "another-company", email: "z@z" };
  assert.equal((await put({ id, sign: { headline: "Hijack" } })).status, 404, "not another company's shop");
  ctx.session = null;
  assert.equal((await put({ id, sign: { headline: "x" } })).status, 401);
});

test("AIERT can add a shop manager to a company that allows support access", async () => {
  const { createManagedCompany, setSupportAccess } = await import("../lib/tapcardBizSupport");
  const { createLocation } = await import("../lib/tapcardBizLocations");
  const { listAdmins } = await import("../lib/tapcardBiz");
  const { POST } = await import("../app/api/admin/tapcard/companies/route");
  const org = await createManagedCompany({ name: "Mgr Add Co", adminEmail: "a@mgradd.example", locations: 2 });
  const add = (email: string) => POST(req("/api/admin/tapcard/companies", { body: { action: "manager", orgId: org.id, email } }));
  ctx.admin = true;
  assert.equal((await add("martin@aiert.co.uk")).status, 400, "needs a shop first");
  const shop = await createLocation(org.id, { name: "Shop", address: "1 St, Town, AB1 2CD", phone: "", email: "", website: "", links: [] });
  ctx.outbox.length = 0;
  assert.equal((await add("martin@aiert.co.uk")).status, 200);
  assert.equal(ctx.outbox.length, 1);
  assert.match(ctx.outbox[0].subject, /manager at Mgr Add Co/);
  const m = (await listAdmins(org.id)).find((a) => a.email === "martin@aiert.co.uk")!;
  assert.equal(m.role, "manager");
  assert.deepEqual(m.location_ids, [shop.id]);
  assert.equal((await add("martin@aiert.co.uk")).status, 409);
  assert.equal((await add("not an email")).status, 400);
  // the company turns support access off: refused
  await setSupportAccess(org.id, null, "company");
  assert.equal((await add("other@aiert.co.uk")).status, 403);
  ctx.admin = false;
  assert.equal((await add("other@aiert.co.uk")).status, 401);
  ctx.admin = true;
});

test("the Companies page lists who can sign in to each company", async () => {
  const { createManagedCompany, listCompaniesForSupport } = await import("../lib/tapcardBizSupport");
  const { addAdmin } = await import("../lib/tapcardBiz");
  const org = await createManagedCompany({ name: "People Co", adminEmail: "owner@people.example", locations: 2 });
  await addAdmin(org.id, "mgr@people.example", "manager", []);
  const row = (await listCompaniesForSupport()).find((c) => c.id === org.id)!;
  assert.deepEqual(row.people.map((p) => [p.email, p.role, p.confirmed]), [["owner@people.example", "admin", false], ["mgr@people.example", "manager", false]]);
});

test("AIERT can remove a shop manager (never an admin) from a company that allows support access", async () => {
  const { createManagedCompany, setSupportAccess } = await import("../lib/tapcardBizSupport");
  const { addAdmin, listAdmins } = await import("../lib/tapcardBiz");
  const { POST } = await import("../app/api/admin/tapcard/companies/route");
  const org = await createManagedCompany({ name: "Remove Co", adminEmail: "owner@removeco.example", locations: 2 });
  await addAdmin(org.id, "tester@removeco.example", "manager", []);
  const rm = (email: string) => POST(req("/api/admin/tapcard/companies", { body: { action: "removeManager", orgId: org.id, email } }));
  ctx.admin = true;
  assert.equal((await rm("owner@removeco.example")).status, 404, "an admin cannot be removed here");
  assert.equal((await rm("nobody@removeco.example")).status, 404);
  assert.equal((await rm("Tester@RemoveCo.example")).status, 200);
  assert.deepEqual((await listAdmins(org.id)).map((a) => a.email), ["owner@removeco.example"]);
  await addAdmin(org.id, "again@removeco.example", "manager", []);
  await setSupportAccess(org.id, null, "company");
  assert.equal((await rm("again@removeco.example")).status, 403, "needs the company's support window");
  ctx.admin = false;
  assert.equal((await rm("again@removeco.example")).status, 401);
  ctx.admin = true;
});

test("the trial welcome email carries the admin's own card link, and an admin can email themselves every waiting shop's link", async () => {
  const { verifyInvite } = await import("../lib/tapcardBizInvite");
  const trial = await import("../app/api/tapcard/biz/trial/route");
  const loc = await import("../app/api/tapcard/biz/locations/route");
  ctx.outbox.length = 0;
  const signup = await trial.POST(req("/api/tapcard/biz/trial", { body: { companyName: "Link Welcome Co", email: "boss@linkwelcome.example", name: "Bo Boss" } }));
  assert.equal(signup.status, 200);
  const welcome = ctx.outbox.find((m) => /Welcome/.test(m.subject))!;
  assert.match(welcome.html, /Make your own card now/);
  const token = welcome.html.match(/business\/claim#([\w.-]+)/)![1];
  const payload = verifyInvite(token)!;
  assert.equal(payload.n, "Bo Boss");
  assert.equal(payload.e, "boss@linkwelcome.example");
  assert.match(welcome.text, /store and your card sets itself up/);

  const orgId = ((await sql`SELECT id FROM tapcard_biz_orgs WHERE name = 'Link Welcome Co'`)[0] as { id: string }).id;
  ctx.session = { orgId, email: "boss@linkwelcome.example" };
  const none = await loc.POST(req("/x", { body: { emailLinks: true } }));
  assert.equal(none.status, 409, "no shops yet");
  await loc.POST(req("/x", { body: { hit: { name: "Link Welcome Co", address: "1 High St, Dunmow, CM6 1AG", phone: "01", website: "", hours: "" } } }));
  ctx.outbox.length = 0;
  const sent = await json(await loc.POST(req("/x", { body: { emailLinks: true } })));
  assert.equal(sent.sent, 1);
  assert.equal(ctx.outbox[0].to, "boss@linkwelcome.example");
  assert.match(ctx.outbox[0].html, /business\/claim#/);
  ctx.session = { orgId, email: "boss@linkwelcome.example", support: true };
  assert.equal((await loc.POST(req("/x", { body: { emailLinks: true } }))).status, 403, "support cannot trigger it");
  ctx.session = null;
});

test("a shop's phone and hours come from its own website first, then from the provider", async () => {
  const { stubs } = await import("./helpers/pgdb");
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { listLocations } = await import("../lib/tapcardBizLocations");
  const { parseStoredLinks } = await import("../lib/tapcardLinks");
  const loc = await import("../app/api/tapcard/biz/locations/route");
  const org = await createManagedCompany({ name: "Site First Co", adminEmail: "a@sitefirst.example", locations: 3 });
  ctx.session = { orgId: org.id, email: "a@sitefirst.example" };
  const add = async (address: string, hit: Record<string, string>) => json(await loc.POST(req("/x", { body: { hit: { name: "Site First Co", address, website: "https://sitefirst.example", ...hit } } })));

  // the site gives its own phone and hours: they win over the provider's
  stubs.findSiteLinks = async () => ({ links: [{ kind: "hours", label: "Opening hours", value: "Mon–Fri: 9.30am–5pm" }], details: { phone: "01371 111111", email: "shop@sitefirst.example" }, branches: [] });
  await add("1 High St, Dunmow, CM6 1AA", { phone: "+44 1371 999999", hours: "Mon-Sat: 09:00 - 17:00" });
  // the site has no hours and no phone for this shop: the provider's are used
  stubs.findSiteLinks = async () => ({ links: [], details: {}, branches: [] });
  await add("2 Mill Ln, Thaxted, CM6 2AA", { phone: "+44 1371 888888", hours: "Mon-Sat: 09:00 - 17:00" });
  stubs.findSiteLinks = undefined;

  const [one, two] = await listLocations(org.id);
  assert.equal(one.phone, "01371 111111", "the website's phone beats the provider's");
  assert.deepEqual(parseStoredLinks(one.links).filter((l) => l.kind === "hours").map((l) => l.value), ["Mon–Fri: 9.30am–5pm"], "the website's hours, not the provider's");
  assert.equal(one.email, "shop@sitefirst.example");
  assert.equal(two.phone, "+44 1371 888888");
  assert.deepEqual(parseStoredLinks(two.links).filter((l) => l.kind === "hours").map((l) => l.value), ["Mon-Sat: 09:00 - 17:00"], "the provider's hours when the site has none");
  ctx.session = null;
});
