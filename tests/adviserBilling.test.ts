import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";
installStubs();

const DAY = 86_400_000;
process.env.TAPCARD_ADVISER_PRICE_T1 = "price_t1"; process.env.TAPCARD_ADVISER_PRICE_T3 = "price_t3"; process.env.TAPCARD_ADVISER_PRICE_T8 = "price_t8";
const cardIds = { a: "cardA", b: "cardB" };
let orgA = "", orgB = "", adviserId = "";

// A stand-in for Stripe that remembers what it was asked to do.
const calls: { kind: string; params: Record<string, unknown> }[] = [];
const subItems: { id: string; price: { id: string }; quantity: number; current_period_end: number }[] = [];
const fake = {
  customers: { create: async (p: Record<string, unknown>) => { calls.push({ kind: "customer", params: p }); return { id: "cus_1" }; } },
  checkout: { sessions: { create: async (p: Record<string, unknown>) => { calls.push({ kind: "checkout", params: p }); return { id: "cs_1", url: "https://stripe.test/pay" }; } } },
  subscriptions: {
    retrieve: async () => ({ id: "sub_1", status: "active", items: { data: subItems } }),
    update: async (_id: string, p: Record<string, unknown>) => {
      calls.push({ kind: "update", params: p });
      for (const it of (p.items as { id?: string; price?: string; quantity?: number; deleted?: boolean }[] | undefined) ?? []) {
        if (it.id && it.deleted) subItems.splice(subItems.findIndex((x) => x.id === it.id), 1);
        else if (it.id) subItems.find((x) => x.id === it.id)!.quantity = it.quantity!;
        else subItems.push({ id: "si_" + it.price, price: { id: it.price! }, quantity: it.quantity!, current_period_end: 0 });
      }
      return {};
    },
  },
  billingPortal: { sessions: { create: async () => ({ url: "https://stripe.test/portal" }) } },
};

async function setup() {
  if (orgA) return;
  await (await import("../lib/tapcardDb")).getCard("none");
  const biz = await import("../lib/tapcardBiz");
  const adv = await import("../lib/tapcardAdvisers");
  orgA = (await biz.createOrg("Alpha plc", "alpha.com")).id;
  orgB = (await biz.createOrg("Beta plc", "beta.com")).id;
  await adv.ensureAdviserSchema();
  await (await import("../lib/tapcardShare")).isListedCard("x");
  for (const [cid, org] of [[cardIds.a, orgA], [cardIds.b, orgB]]) {
    await db`INSERT INTO tapcard_cards (id, name, company, org_id, label, edit_token_hash) VALUES (${cid}, 'C', 'C', ${org}, 'Business', 'h') ON CONFLICT DO NOTHING`;
    await db`INSERT INTO tapcard_listed_cards (card_id) VALUES (${cid}) ON CONFLICT DO NOTHING`.catch(() => {});
  }
  adviserId = await adv.createAdviser("IFC Advisory", [{ email: "tim@ifc.com", senior: true }]);
}
async function approvedLink(org: string, capM: number) {
  const a = await import("../lib/tapcardAdvisers");
  const r = await a.requestLink(adviserId, org, "tim@ifc.com", { capM, covers: true });
  const id = (r as { linkId: string }).linkId;
  await a.decideLink(org, id, true, "ceo@x.com");
  return id;
}

test("market cap picks the tier and the monthly price", async () => {
  const p = await import("../lib/tapcardAdviserPricing");
  assert.equal(p.tierForMarketCap(5).tier, 1);
  assert.equal(p.tierForMarketCap(10).tier, 2, "10m is the start of the next band");
  assert.equal(p.tierForMarketCap(45).tier, 3);
  assert.equal(p.tierForMarketCap(1000).tier, 8);
  assert.equal(p.tierForMarketCap(99999).monthlyPence, 10000);
  assert.equal(p.monthlyTotalPence([1, 3, 8]), 2500 + 4000 + 10000);
  assert.deepEqual(p.tierQuantities([1, 1, 3]), { 1: 2, 3: 1 });
  assert.equal(p.ADVISER_TIERS.length, 8);
});

test("trial: one company free for 30 days, a second needs the adviser to have paid, expiry stops cover with no grace", async () => {
  await setup();
  const b = await import("../lib/tapcardAdviserBilling");
  const l1 = await approvedLink(orgA, 5);
  const l2 = await approvedLink(orgB, 45);
  assert.equal(await b.adviserCoverActive(orgA), false, "approved but not yet accepted as cover");
  assert.deepEqual(await b.activateCover(l1), { ok: true });
  assert.equal(await b.adviserCoverActive(orgA), true);
  const second = await b.activateCover(l2);
  assert.equal(second.ok, false, "a second company needs the adviser to have signed and paid");
  assert.equal(await b.adviserCoverActive(orgB), false);
  const a = (await b.getAdviserBilling(adviserId))!;
  assert.equal(a.trialOrgId, orgA);
  assert.ok(Math.abs((a.trialEndsAt!.getTime() - Date.now()) - 30 * DAY) < 60_000, "30 days");
  // after the trial: no cover, and no grace for an unpaid trial
  assert.equal(await b.adviserCoverActive(orgA, Date.now() + 31 * DAY), false);
});

test("terms, checkout (card now, charged on day 30), then more companies are billed per tier and prorated", async () => {
  await setup();
  const b = await import("../lib/tapcardAdviserBilling");
  const none = await b.createAdviserCheckout(adviserId, "tim@ifc.com", "https://x.test", fake);
  assert.equal(none.ok === false && /terms/i.test(none.error), true, "terms first");
  await b.acceptTerms(adviserId, "tim@ifc.com");
  // the day-16 reminder: not due yet (30 days left), due once 14 or fewer days remain, and only once
  assert.equal((await b.runAdviserDaily(new Date(), fake)).reminders.length, 0);
  const later = new Date(Date.now() + 17 * DAY);
  const due = await b.runAdviserDaily(later, fake);
  assert.deepEqual(due.reminders.map((r) => r.name), ["IFC Advisory"]);
  await b.markReminded(adviserId);
  assert.equal((await b.runAdviserDaily(later, fake)).reminders.length, 0, "reminded once");

  const co = await b.createAdviserCheckout(adviserId, "tim@ifc.com", "https://x.test", fake);
  assert.ok(co.ok);
  const sess = calls.find((c) => c.kind === "checkout")!.params as { line_items: { price: string; quantity: number }[]; subscription_data: { trial_end?: number; metadata: { adviser_id: string } }; payment_method_collection: string };
  assert.deepEqual(sess.line_items, [{ price: "price_t1", quantity: 1 }], "one company in tier 1");
  assert.ok(sess.subscription_data.trial_end && Math.abs(sess.subscription_data.trial_end * 1000 - (await b.getAdviserBilling(adviserId))!.trialEndsAt!.getTime()) < 1000, "first charge on the last day of the trial");
  assert.equal(sess.payment_method_collection, "always");

  // Stripe tells us it is done: the adviser is active
  subItems.push({ id: "si_price_t1", price: { id: "price_t1" }, quantity: 1, current_period_end: Math.floor((Date.now() + 30 * DAY) / 1000) });
  await b.applyCheckoutCompleted(adviserId, "cus_1", { id: "sub_1", status: "trialing", trial_end: Math.floor((Date.now() + 13 * DAY) / 1000), items: { data: subItems } });
  assert.equal((await b.getAdviserBilling(adviserId))!.billingStatus, "active");

  // a second company (market cap 45m = tier 3) can now be covered, and the subscription gains a tier 3 line
  const l2 = (await (await import("../lib/tapcardAdvisers")).linksForAdviser(adviserId)).find((l) => l.orgId === orgB)!.id;
  assert.deepEqual(await b.activateCover(l2, new Date(), fake), { ok: true });
  assert.ok(calls.some((c) => c.kind === "update" && JSON.stringify(c.params.items) === JSON.stringify([{ price: "price_t3", quantity: 1 }]) && c.params.proration_behavior === "create_prorations"));
  assert.equal(await b.adviserCoverActive(orgB), true);
  const s = await b.adviserSummary(adviserId);
  assert.equal(s.monthlyPence, 2500 + 4000);
});

test("6-month minimum: stopping early ends at the end of the term, then a 30-day grace; a tier change applies; a lapsed adviser gives grace", async () => {
  await setup();
  const b = await import("../lib/tapcardAdviserBilling");
  const links = await (await import("../lib/tapcardAdvisers")).linksForAdviser(adviserId);
  const lB = links.find((l) => l.orgId === orgB)!;
  const r = await b.endCover(lB.id);
  assert.ok(r.ok);
  const committed = new Date(lB.committedUntil ?? (await (await import("../lib/tapcardAdvisers")).getLink(lB.id))!.committedUntil!).getTime();
  assert.ok(committed - Date.now() > 170 * DAY, "committed for about 6 months");
  assert.equal((r as { endsAt: Date }).endsAt.getTime(), committed, "ends at the end of the term, not now");
  assert.equal(await b.adviserCoverActive(orgB), true, "still covered during the term");
  const afterTerm = committed + DAY;
  assert.equal(await b.adviserCoverActive(orgB, afterTerm + 10 * DAY), true, "inside the 30-day grace");
  assert.equal(await b.adviserCoverActive(orgB, afterTerm + 40 * DAY), false, "grace over");
  // the daily job ends it and takes the tier 3 line off the subscription
  const done = await b.runAdviserDaily(new Date(committed + 2 * DAY), fake);
  assert.equal(done.ended, 1);
  assert.ok(!subItems.some((i) => i.price.id === "price_t3"));
  // AIERT moves a company to another tier: the next sync uses it
  assert.equal(await b.setLinkTier(links.find((l) => l.orgId === orgA)!.id, 8), true);
  await b.syncAdviserSubscription(adviserId, fake);
  assert.ok(subItems.some((i) => i.price.id === "price_t8" && i.quantity === 1) && !subItems.some((i) => i.price.id === "price_t1"));
  assert.equal(await b.setLinkTier(links[0].id, 99), false, "not a real tier");
  // payment lapses: cover continues for 30 days after the last paid period, then stops
  const paidThrough = (await b.getAdviserBilling(adviserId))!.paidThrough!.getTime();
  await db`UPDATE tapcard_advisers SET billing_status = 'past_due' WHERE id = ${adviserId}`;
  assert.equal(await b.adviserCoverActive(orgA, paidThrough + 20 * DAY), true);
  assert.equal(await b.adviserCoverActive(orgA, paidThrough + 40 * DAY), false);
});

test("Stripe events for advisers update status; unknown subscriptions are ignored; Business billing is untouched", async () => {
  await setup();
  const b = await import("../lib/tapcardAdviserBilling");
  await db`UPDATE tapcard_advisers SET billing_status = 'past_due' WHERE id = ${adviserId}`;
  assert.equal(await b.applySubscription({ id: "sub_1", status: "active", items: { data: [{ id: "i", price: { id: "p" }, quantity: 1, current_period_end: Math.floor((Date.now() + 30 * DAY) / 1000) }] } }), true);
  assert.equal((await b.getAdviserBilling(adviserId))!.billingStatus, "active");
  assert.equal(await b.applySubscription({ id: "sub_other", status: "active", items: { data: [] } }), false);
  const orgs = (await db`SELECT column_name FROM information_schema.columns WHERE table_name = 'tapcard_biz_orgs'`) as { column_name: string }[];
  assert.ok(!orgs.some((c) => /adviser|covered/.test(c.column_name)), "the Business org table has no adviser billing columns");
});

test("one adviser at a time, the data-ownership confirmation, and an append-only agreement record", async () => {
  await setup();
  const a = await import("../lib/tapcardAdvisers");
  const { runNewsAction } = await import("../lib/tapcardNewsActions");
  const ad = await import("../lib/tapcardAdviserAdmin");
  await (await import("../lib/tapcardNewsPolicy")).ensurePolicySchema();
  const orgC = (await (await import("../lib/tapcardBiz")).createOrg("Epsilon plc", "epsilon.com")).id;
  await db`INSERT INTO tapcard_cards (id, name, company, org_id, label, edit_token_hash) VALUES ('cardE', 'E', 'Epsilon plc', ${orgC}, 'Business', 'h') ON CONFLICT DO NOTHING`;
  await db`INSERT INTO tapcard_listed_cards (card_id) VALUES ('cardE') ON CONFLICT DO NOTHING`.catch(() => {});
  await db`INSERT INTO tapcard_biz_admins (id, org_id, email, role, senior) VALUES ('ie', ${orgC}, 'ceo@epsilon.com', 'admin', true) ON CONFLICT DO NOTHING`;
  const second = await a.createAdviser("Other Brokers", [{ email: "x@other.com", senior: true }]);
  const company = { orgId: orgC, email: "ceo@epsilon.com" };

  const r1 = await a.requestLink(adviserId, orgC, "tim@ifc.com", { capM: 20, covers: true });
  const l1 = (r1 as { linkId: string }).linkId;
  const r2 = await a.requestLink(second, orgC, "x@other.com", { capM: 20, covers: true });
  assert.ok(r1.ok && r2.ok, "both can ask while nobody is approved");
  // approval needs the confirmation
  const noAck = await runNewsAction(company, "cardE", { action: "adviserDecide", linkId: l1, approve: true });
  assert.equal(noAck.status, 400); assert.equal((noAck.json as { code: string }).code, "ack_required");
  const ok = await runNewsAction(company, "cardE", { action: "adviserDecide", linkId: l1, approve: true, ackData: true, acceptCover: false });
  assert.equal(ok.status, 200);
  // a second adviser can neither be approved nor ask now
  const l2 = (r2 as { linkId: string }).linkId;
  const blocked = await runNewsAction(company, "cardE", { action: "adviserDecide", linkId: l2, approve: true, ackData: true });
  assert.equal(blocked.status, 409); assert.equal((blocked.json as { code: string }).code, "one_adviser");
  const third = await a.createAdviser("Third Firm", [{ email: "z@third.com", senior: true }]);
  const ask = await a.requestLink(third, orgC, "z@third.com");
  assert.equal(ask.ok, false);
  // after removing the first adviser the company can change
  assert.equal((await runNewsAction(company, "cardE", { action: "adviserRevoke", linkId: l1 })).status, 200);
  assert.equal((await runNewsAction(company, "cardE", { action: "adviserDecide", linkId: l2, approve: true, ackData: true })).status, 200);

  // AIERT records the signed agreement
  assert.equal((await ad.adminRecordContract(l2, "x", "2026-11-20", "A CEO", "")).ok, false, "a reference is needed");
  assert.equal((await ad.adminRecordContract(l2, "OTH-2026-01", "2026-11-20", "A. CEO", "http://insecure")).ok, false);
  assert.ok((await ad.adminRecordContract(l2, "OTH-2026-01", "2026-11-20", "A. CEO", "https://docs.example/oth.pdf")).ok);

  const rows = await a.listAgreement(orgC);
  const events = rows.map((r) => r.event).reverse();
  assert.deepEqual(events, ["adviser-approved", "adviser-removed", "adviser-approved", "contract-recorded"], "every step is on the record, oldest first");
  const approved = rows.find((r) => r.event === "adviser-approved")!;
  assert.equal(approved.dataOwner, "Epsilon plc", "the company is recorded as the data owner");
  assert.ok(String(approved.detail.companyConfirmed).includes("owner and controller of its followers' data"), "the statement the company confirmed is kept");
  assert.equal(approved.actor, "ceo@epsilon.com");
  assert.equal(rows[0].contractRef, "OTH-2026-01", "the contract reference rides on later entries");
  assert.ok(rows.every((r) => r.dataTermsVersion), "the terms version is recorded");
});
