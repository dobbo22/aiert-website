import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";
installStubs();

const row = (o: Partial<import("../lib/adviserPortfolioRules").PortfolioRow>) => ({ orgId: "x", name: "Co", status: "approved", canRegulatory: false, coverStatus: "none", tierLabel: "", monthlyPence: 0, committedUntil: null, coverEndsAt: null, followers: 0, lastHeadline: null, lastHeadlineAt: null, waitingForYou: 0, yourDrafts: 0, noPage: false, ...o });

test("search, filters, sorting and totals across many companies", async () => {
  const p = await import("../lib/adviserPortfolio");
  const rows = [
    row({ orgId: "a", name: "Zeta plc", followers: 100, coverStatus: "active", monthlyPence: 4000 }),
    row({ orgId: "b", name: "Alpha plc", followers: 50, waitingForYou: 2 }),
    row({ orgId: "c", name: "Beta plc", status: "pending" }),
    row({ orgId: "d", name: "Gamma plc", noPage: true, coverStatus: "ending", monthlyPence: 2500 }),
    row({ orgId: "e", name: "Delta plc", status: "declined" }),
  ];
  assert.deepEqual(p.sortRows(rows).map((r) => r.name), ["Alpha plc", "Gamma plc", "Zeta plc", "Beta plc", "Delta plc"], "needs attention first, then workable, then waiting, then the rest");
  assert.deepEqual(p.filterRows(rows, "", "attention").map((r) => r.name).sort(), ["Alpha plc", "Gamma plc"]);
  assert.deepEqual(p.filterRows(rows, "", "paying").map((r) => r.name).sort(), ["Gamma plc", "Zeta plc"]);
  assert.deepEqual(p.filterRows(rows, "", "waiting").map((r) => r.name), ["Beta plc"]);
  assert.deepEqual(p.filterRows(rows, "ALP", "all").map((r) => r.name), ["Alpha plc"], "search ignores case");
  const t = p.portfolioTotals(rows);
  assert.equal(t.companies, 3); assert.equal(t.pending, 1); assert.equal(t.attention, 2); assert.equal(t.waitingForYou, 2); assert.equal(t.followers, 150); assert.equal(t.monthlyPence, 6500);
});

test("the portfolio gathers followers, last headline, waiting drafts and a missing announcements page for each company", async () => {
  await (await import("../lib/tapcardDb")).getCard("none");
  const biz = await import("../lib/tapcardBiz"); const adv = await import("../lib/tapcardAdvisers"); const pol = await import("../lib/tapcardNewsPolicy");
  const offers = await import("../lib/tapcardOffers"); const p = await import("../lib/adviserPortfolio");
  await (await import("../lib/tapcardShare")).isListedCard("x"); await adv.ensureAdviserSchema(); await pol.ensurePolicySchema();
  const a = (await biz.createOrg("Port A plc", "a.com")).id, b = (await biz.createOrg("Port B plc", "b.com")).id;
  for (const [cid, org] of [["pA", a], ["pB", b]]) {
    await db`INSERT INTO tapcard_cards (id, name, company, org_id, label, edit_token_hash) VALUES (${cid}, 'C', 'C', ${org}, 'Business', 'h')`;
    await db`INSERT INTO tapcard_listed_cards (card_id) VALUES (${cid})`.catch(() => {});
  }
  await offers.setFollower("pA", "one", true); await offers.setFollower("pA", "two", true);
  await (await import("../lib/tapcardIrFeed")).getFeedConfig("none");
  await db`INSERT INTO tapcard_announcements (card_id, text) VALUES ('pA', 'Results out')`;
  await db`INSERT INTO tapcard_ir_feed (card_id, page_url) VALUES ('pA', 'https://a.com/rns')`;
  const ifc = await adv.createAdviser("IFC", [{ email: "tim@ifc.com", senior: true }]);
  for (const org of [a, b]) { const r = (await adv.requestLink(ifc, org, "tim@ifc.com", { capM: 20 })) as { linkId: string }; await adv.decideLink(org, r.linkId, true, "x"); }
  await adv.setLinkRegulatory(a, (await adv.linksForAdviser(ifc)).find((l) => l.orgId === a)!.id, true);
  await pol.createDraft({ orgId: a, cardId: "pA", kind: "rns", text: "t", link: "https://a.com/x", groups: [], createdBy: "cfo@a.com", websiteStatus: "found" });
  await pol.createDraft({ orgId: a, cardId: "pA", kind: "rns", text: "u", link: "https://a.com/y", groups: [], createdBy: "tim@ifc.com", websiteStatus: "found" });

  const rows = await p.adviserPortfolio(ifc, { email: "tim@ifc.com", senior: true });
  const A = rows.find((r) => r.orgId === a)!, B = rows.find((r) => r.orgId === b)!;
  assert.equal(A.followers, 2); assert.equal(A.lastHeadline, "Results out"); assert.equal(A.noPage, false);
  assert.equal(A.waitingForYou, 1, "only the draft written by someone else waits for Tim");
  assert.equal(A.yourDrafts, 1);
  assert.equal(B.followers, 0); assert.equal(B.noPage, true, "no announcements page watched"); assert.equal(B.waitingForYou, 0);
  const junior = await p.adviserPortfolio(ifc, { email: "jo@ifc.com", senior: false });
  assert.equal(junior.find((r) => r.orgId === a)!.waitingForYou, 0, "general staff are never asked to approve");
});
