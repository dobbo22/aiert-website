import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";
installStubs();

test("AIERT overview: setting up advisers and staff, confirming a band, extending a trial, and who pays", async () => {
  await (await import("../lib/tapcardDb")).getCard("none");
  const biz = await import("../lib/tapcardBiz");
  const adv = await import("../lib/tapcardAdvisers");
  const ad = await import("../lib/tapcardAdviserAdmin");
  const bill = await import("../lib/tapcardAdviserBilling");
  await adv.ensureAdviserSchema();
  await (await import("../lib/tapcardShare")).isListedCard("x");
  const orgId = (await biz.createOrg("Gamma plc", "gamma.com")).id;
  const other = (await biz.createOrg("Delta plc", "delta.com")).id;
  for (const [cid, org] of [["cardG", orgId], ["cardD", other]]) {
    await db`INSERT INTO tapcard_cards (id, name, company, org_id, label, edit_token_hash) VALUES (${cid}, 'C', 'C', ${org}, 'Business', 'h') ON CONFLICT DO NOTHING`;
    await db`INSERT INTO tapcard_listed_cards (card_id) VALUES (${cid}) ON CONFLICT DO NOTHING`.catch(() => {});
  }
  assert.equal((await ad.adminCreateAdviser("X", "nope", "", true)).ok, false);
  const made = await ad.adminCreateAdviser("IFC Advisory", "tim@ifc.com", "Tim", true);
  assert.ok(made.ok && made.adviserId);
  const id = made.adviserId!;
  assert.ok((await ad.adminAddUser(id, "jo@ifc.com", "Jo", false)).ok);
  assert.equal((await ad.adminRemoveUser(id, "tim@ifc.com")).ok, false, "the only senior cannot be removed");
  assert.ok((await ad.adminAddUser(id, "jo@ifc.com", "", true)).ok, "making Jo senior");
  assert.ok((await ad.adminRemoveUser(id, "tim@ifc.com")).ok);

  const r = await adv.requestLink(id, orgId, "jo@ifc.com", { capM: 45, covers: true });
  const linkId = (r as { linkId: string }).linkId;
  await adv.decideLink(orgId, linkId, true, "ceo@gamma.com");
  assert.ok((await bill.activateCover(linkId)).ok);
  let o = await ad.adviserOverview();
  let a = o.advisers.find((x) => x.id === id)!;
  assert.equal(a.links[0].suggestedTier, 3, "£45m suggests band 3");
  assert.equal(a.links[0].tierConfirmed, false);
  assert.equal(a.tiersToCheck, 1, "an unconfirmed band for a company being paid for needs checking");
  assert.equal(o.totals.tiersToCheck, 1);
  assert.equal(o.whoPays.find((w) => w.orgId === orgId)!.payer, "Adviser: IFC Advisory");
  assert.equal(o.whoPays.find((w) => w.orgId === other)!.payer, "The company itself");

  assert.equal((await ad.adminSetTier(linkId, 99)).ok, false);
  assert.ok((await ad.adminSetTier(linkId, 4)).ok);
  o = await ad.adviserOverview(); a = o.advisers.find((x) => x.id === id)!;
  assert.equal(a.links[0].tier, 4); assert.equal(a.links[0].tierConfirmed, true); assert.equal(a.tiersToCheck, 0);
  assert.equal(o.totals.mrrPence, 0, "an adviser still on trial is not counted as paying");
  assert.ok((await (await import("../lib/tapcardNewsPolicy")).listAudit(orgId)).some((t) => t.action === "adviser-tier-set"), "the company sees the band change in its audit trail");

  assert.equal((await ad.adminExtendTrial(id, 0)).ok, false);
  const before = (await bill.getAdviserBilling(id))!.trialEndsAt!.getTime();
  assert.ok((await ad.adminExtendTrial(id, 14)).ok);
  assert.equal((await bill.getAdviserBilling(id))!.trialEndsAt!.getTime() - before, 14 * 86_400_000);
});
