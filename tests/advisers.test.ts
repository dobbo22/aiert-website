import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";
installStubs();

const cardId = "cardAdv";
let orgId = "", orgNoIr = "", adviserId = "";
const posts: unknown[] = [];

async function setup() {
  if (orgId) return;
  await (await import("../lib/tapcardDb")).getCard("none");
  const biz = await import("../lib/tapcardBiz");
  const adv = await import("../lib/tapcardAdvisers");
  orgId = (await biz.createOrg("KEFI plc", "kefi.com")).id;
  orgNoIr = (await biz.createOrg("Corner Cafe", "cafe.com")).id;
  await adv.ensureAdviserSchema();
  await (await import("../lib/tapcardNewsPolicy")).ensurePolicySchema();
  await (await import("../lib/tapcardShare")).isListedCard("x"); // creates the listed table
  await db`INSERT INTO tapcard_cards (id, name, company, org_id, label, edit_token_hash) VALUES (${cardId}, 'KEFI', 'KEFI plc', ${orgId}, 'Business', 'h') ON CONFLICT DO NOTHING`.catch(async (e) => { throw e; });
  await db`INSERT INTO tapcard_listed_cards (card_id) VALUES (${cardId}) ON CONFLICT DO NOTHING`.catch(() => {});
  for (const [e, role, senior] of [["ceo@kefi.com", "admin", true], ["cfo@kefi.com", "admin", true]] as const)
    await db`INSERT INTO tapcard_biz_admins (id, org_id, email, role, senior) VALUES (${"i" + e}, ${orgId}, ${e}, ${role}, ${senior}) ON CONFLICT DO NOTHING`;
  adviserId = await adv.createAdviser("IFC Advisory", [{ email: "tim@ifc.com", senior: true }, { email: "junior@ifc.com", senior: false }]);
}

test("an adviser has no access until the company approves; only listed companies can be asked; a decision is made once", async () => {
  await setup();
  const a = await import("../lib/tapcardAdvisers");
  assert.deepEqual((await a.findListedOrgs("kefi")).map((x) => x.name), ["KEFI plc"]);
  assert.deepEqual(await a.findListedOrgs("cafe"), [], "a company that isn't set up for IR isn't offered");
  assert.equal((await a.requestLink(adviserId, orgNoIr, "tim@ifc.com")).ok, false);
  const r = await a.requestLink(adviserId, orgId, "tim@ifc.com");
  assert.ok(r.ok && r.created);
  assert.equal((await a.requestLink(adviserId, orgId, "tim@ifc.com") as { created: boolean }).created, false, "asking twice opens one request");
  assert.equal(await a.approvedLink(adviserId, orgId), null, "pending gives no access");
  const linkId = (r as { linkId: string }).linkId;
  assert.equal(await a.decideLink("some-other-org", linkId, true, "x@y.com"), false, "only the company named on the request can answer it");
  assert.equal(await a.decideLink(orgId, linkId, true, "ceo@kefi.com"), true);
  assert.equal(await a.decideLink(orgId, linkId, false, "cfo@kefi.com"), false, "answered once");
  const link = await a.approvedLink(adviserId, orgId);
  assert.ok(link && link.canRegulatory === false);
});

test("adviser rules: general by default; regulatory only when the company allows it AND the staff member is senior; settings never", async () => {
  await setup();
  const a = await import("../lib/tapcardAdvisers");
  const f = await import("../lib/tapcardNewsFlow");
  const p = await import("../lib/tapcardNewsPolicy");
  const link = (await a.approvedLink(adviserId, orgId))!;
  const act = (email: string, senior: boolean, canRegulatory: boolean) => ({ orgId, email, adviser: { id: adviserId, name: "IFC Advisory", senior, canRegulatory } });
  const post = async (x: unknown) => { posts.push(x); return { ok: true as const }; };
  const base = { cardId, groups: [] as string[], override: false, post };
  const rns = { kind: "rns" as const, text: "Results (RNS)", link: "https://www.kefi.com/rns/results" };

  // general: any approved adviser staff member
  assert.deepEqual(await f.submitNews({ ...base, actor: act("junior@ifc.com", false, false), kind: "general", text: "Webcast", link: "" }), { ok: true, outcome: "posted" });
  // regulatory refused: company has not allowed it
  const r1 = await f.submitNews({ ...base, ...rns, actor: act("tim@ifc.com", true, false) });
  assert.equal(r1.ok === false && r1.code, "not_senior");
  // allowed by the company but the staff member is not senior
  assert.equal(await a.setLinkRegulatory(orgId, link.id, true), true);
  const r2 = await f.submitNews({ ...base, ...rns, actor: act("junior@ifc.com", false, true) });
  assert.equal(r2.ok === false && r2.code, "not_senior");
  // senior + allowed: reaches the website check (nothing on the page yet, so it asks for a confirmation rather than posting)
  const r3 = await f.submitNews({ ...base, ...rns, actor: act("tim@ifc.com", true, true) });
  assert.equal(r3.ok === false && r3.code, "not_on_website");
  assert.equal(posts.length, 1, "nothing regulatory went out");
  // the audit trail names the adviser
  assert.ok((await p.listAudit(orgId)).some((t) => t.action === "refused" && t.actor === "junior@ifc.com (IFC Advisory)"));

  // settings are never available to an adviser, even a senior one
  const { runNewsAction } = await import("../lib/tapcardNewsActions");
  const setApproval = await runNewsAction(act("tim@ifc.com", true, true), cardId, { action: "setApproval", on: true });
  assert.equal(setApproval.status, 403);
  const decide = await runNewsAction(act("tim@ifc.com", true, true), cardId, { action: "adviserSetRegulatory", linkId: link.id, on: false });
  assert.equal(decide.status, 403);
  // the company can take the permission back, and remove the adviser: access ends at once
  const company = { orgId, email: "ceo@kefi.com" };
  assert.equal((await runNewsAction(company, cardId, { action: "adviserSetRegulatory", linkId: link.id, on: false })).status, 200);
  assert.equal((await runNewsAction(company, cardId, { action: "adviserRevoke", linkId: link.id })).status, 200);
  assert.equal(await a.approvedLink(adviserId, orgId), null);
  const trail = (await p.listAudit(orgId)).map((t) => t.action);
  assert.ok(trail.includes("adviser-revoked") && trail.includes("adviser-regulatory-off"));
});

test("second approval counts an allowed adviser's senior staff as approvers, and the author cannot approve their own", async () => {
  await setup();
  const a = await import("../lib/tapcardAdvisers");
  const f = await import("../lib/tapcardNewsFlow");
  const p = await import("../lib/tapcardNewsPolicy");
  // a fresh adviser link for the company, allowed to do regulatory news
  const adv2 = await a.createAdviser("Broker Ltd", [{ email: "sue@broker.com", senior: true }]);
  const l = await a.requestLink(adv2, orgId, "sue@broker.com");
  const id = (l as { linkId: string }).linkId;
  await a.decideLink(orgId, id, true, "ceo@kefi.com"); await a.setLinkRegulatory(orgId, id, true);
  assert.deepEqual(await a.adviserApproverEmails(orgId), ["sue@broker.com"]);
  await p.setApprovalRequired(orgId, true);
  // the adviser writes a regulatory headline: it waits, and the company's senior admin approves it
  const adviser = { orgId, email: "sue@broker.com", adviser: { id: adv2, name: "Broker Ltd", senior: true, canRegulatory: true } };
  await db`INSERT INTO tapcard_ir_feed (card_id, page_url, last_checked_at) VALUES (${cardId}, 'https://www.kefi.com/rns', now()) ON CONFLICT (card_id) DO UPDATE SET last_checked_at = now()`.catch(() => {});
  await db`INSERT INTO tapcard_ir_items (card_id, url, title, status) VALUES (${cardId}, 'https://www.kefi.com/rns/results', 'Results announced', 'new') ON CONFLICT DO NOTHING`.catch(() => {});
  const sub = await f.submitNews({ actor: adviser, cardId, kind: "rns", text: "Results announced (RNS)", link: "https://www.kefi.com/rns/results", groups: [], override: false, post: async (x) => { posts.push(x); return { ok: true as const }; } });
  assert.ok(sub.ok && sub.outcome === "pending");
  const draftId = (sub as { draftId: number }).draftId;
  const self = await f.approveDraftNews({ actor: adviser, draftId, override: false, post: async () => ({ ok: true as const }) });
  assert.equal(self.ok === false && self.code, "own_draft");
  const done = await f.approveDraftNews({ actor: { orgId, email: "ceo@kefi.com" }, draftId, override: false, post: async (x) => { posts.push(x); return { ok: true as const }; } });
  assert.equal(done.ok, true);
  const approved = (await p.listAudit(orgId)).find((t) => t.action === "approved");
  assert.equal(approved?.detail.writtenBy, "sue@broker.com");
});

test("adviser sign-in link works once; the cookie is signed and tamper-proof", async () => {
  await setup();
  const a = await import("../lib/tapcardAdvisers");
  assert.deepEqual((await a.advisersForEmail("stranger@x.com")), []);
  const t = await a.createAdviserLoginToken("tim@ifc.com");
  assert.equal(await a.consumeAdviserLoginToken(t), "tim@ifc.com");
  assert.equal(await a.consumeAdviserLoginToken(t), null, "single use");
  const c = a.createAdviserCookie("tim@ifc.com");
  assert.equal(a.verifyAdviserCookie(c), "tim@ifc.com");
  const [e, exp, sig] = c.split(".");
  assert.equal(a.verifyAdviserCookie([Buffer.from("ceo@kefi.com").toString("base64url"), exp, sig].join(".")), null, "another email with the same signature is refused");
  assert.equal(a.verifyAdviserCookie(`${e}.${Number(exp) + 1}.${sig}`), null);
  assert.equal(a.verifyAdviserCookie(undefined), null);
});
