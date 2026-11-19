import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";
installStubs();

test("website check ignores http/https, www, trailing slash, fragments and tracking parameters", async () => {
  const { sameAnnouncementUrl: same, headlineMatchesTitle } = await import("../lib/tapcardNewsPolicy");
  assert.ok(same("https://www.kefi.com/rns/results/", "http://kefi.com/rns/results#top"));
  assert.ok(same("https://kefi.com/rns?id=4&utm_source=x", "https://kefi.com/rns?id=4"));
  assert.equal(same("https://kefi.com/rns?id=4", "https://kefi.com/rns?id=5"), false);
  assert.equal(same("https://kefi.com/a", "https://evil.com/a"), false);
  assert.equal(same("not a url", "not a url"), false);
  assert.ok(headlineMatchesTitle("Full year results announced (RNS)", "Full Year Results announced"));
  assert.equal(headlineMatchesTitle("Director dealing", "Full year results announced"), false);
});

let orgId = "";
async function setup() {
  await (await import("../lib/tapcardDb")).getCard("none"); // the company tables add columns to tapcard_cards
  const { ensurePolicySchema } = await import("../lib/tapcardNewsPolicy");
  await ensurePolicySchema();
  const card = "cardKefi";
  if (!orgId) orgId = (await (await import("../lib/tapcardBiz")).createOrg("KEFI", "kefi.com")).id;
  const org = orgId;
  for (const [e, role, senior] of [["ceo@kefi.com", "admin", true], ["cfo@kefi.com", "admin", true], ["ir@kefi.com", "admin", false], ["shop@kefi.com", "manager", true]] as const) {
    await db`INSERT INTO tapcard_biz_admins (id, org_id, email, role, senior) VALUES (${"id-" + e}, ${org}, ${e}, ${role}, ${senior}) ON CONFLICT DO NOTHING`;
  }
  const feed = await import("../lib/tapcardIrFeed");
  await feed.getFeedConfig(card);
  await db`INSERT INTO tapcard_ir_feed (card_id, page_url, last_checked_at) VALUES (${card}, 'https://www.kefi.com/rns', now()) ON CONFLICT (card_id) DO UPDATE SET last_checked_at = now()`;
  await db`INSERT INTO tapcard_ir_items (card_id, url, title, status) VALUES (${card}, 'https://www.kefi.com/rns/results', 'Full Year Results announced', 'new') ON CONFLICT DO NOTHING`;
  return { org, card };
}
const posts: { text: string; link: string; groups: string[] }[] = [];
const post = async (p: { text: string; link: string; groups: string[] }) => { posts.push(p); return { ok: true as const }; };

test("regulatory news: senior only, link required, checked against the website, and always in the audit trail", async () => {
  const { org, card } = await setup();
  const f = await import("../lib/tapcardNewsFlow");
  const p = await import("../lib/tapcardNewsPolicy");
  const A = (email: string) => ({ orgId: org, email });
  const base = { cardId: card, groups: [] as string[], override: false, post };

  // general news: anyone, even a non-senior
  assert.deepEqual(await f.submitNews({ ...base, actor: A("ir@kefi.com"), kind: "general", text: "Webcast at 10am", link: "" }), { ok: true, outcome: "posted" });
  // regulatory: a non-senior admin, a manager and AIERT support are refused
  for (const actor of [A("ir@kefi.com"), A("shop@kefi.com"), { ...A("martin@aiert.co.uk"), support: true }]) {
    const r = await f.submitNews({ ...base, actor, kind: "rns", text: "Results (RNS)", link: "https://www.kefi.com/rns/results" });
    assert.equal(r.ok, false); if (!r.ok) assert.equal(r.code, "not_senior");
  }
  assert.equal(posts.length, 1, "nothing was posted by the refused attempts");
  // link is required
  const noLink = await f.submitNews({ ...base, actor: A("ceo@kefi.com"), kind: "rns", text: "Results (RNS)", link: "" });
  assert.equal(noLink.ok === false && noLink.code, "link_required");
  // senior + link on the website: posts
  const ok = await f.submitNews({ ...base, actor: A("ceo@kefi.com"), kind: "rns", text: "Full year results announced (RNS)", link: "https://kefi.com/rns/results/" });
  assert.deepEqual(ok, { ok: true, outcome: "posted" });
  // not on the website: stopped until the senior overrides, and the override is recorded
  const miss = await f.submitNews({ ...base, actor: A("ceo@kefi.com"), kind: "rns", text: "Placing (RNS)", link: "https://www.kefi.com/rns/placing" });
  assert.equal(miss.ok === false && miss.code, "not_on_website");
  const forced = await f.submitNews({ ...base, override: true, actor: A("ceo@kefi.com"), kind: "rns", text: "Placing (RNS)", link: "https://www.kefi.com/rns/placing" });
  assert.equal(forced.ok, true);
  const trail = await p.listAudit(org);
  const posted = trail.filter((t) => t.action === "posted" && t.kind === "rns");
  assert.equal(posted.length, 2);
  assert.equal(posted[0].detail.override, true, "the override is on the record");
  assert.equal(posted[1].detail.website, "found");
  assert.ok(trail.some((t) => t.action === "refused" && t.actor === "ir@kefi.com"), "refusals are recorded too");

  // withdrawing a regulatory headline needs a senior
  let cleared = 0;
  const bad = await f.withdrawNewsChecked({ actor: A("ir@kefi.com"), cardId: card, clear: async () => { cleared++; } });
  assert.equal(bad.ok === false && bad.code, "not_senior"); assert.equal(cleared, 0);
  assert.equal((await f.withdrawNewsChecked({ actor: A("cfo@kefi.com"), cardId: card, clear: async () => { cleared++; } })).ok, true); assert.equal(cleared, 1);
});

test("second approval: written by one, approved by a different senior admin, once", async () => {
  const { org, card } = await setup();
  const f = await import("../lib/tapcardNewsFlow");
  const p = await import("../lib/tapcardNewsPolicy");
  const A = (email: string) => ({ orgId: org, email });
  await p.setApprovalRequired(org, true);
  posts.length = 0;
  const link = "https://www.kefi.com/rns/results";
  // anyone with posting rights can write it (even a non-senior); it is not sent
  const sub = await f.submitNews({ actor: A("ir@kefi.com"), cardId: card, kind: "rns", text: "Full year results (RNS)", link, groups: [], override: false, post });
  assert.ok(sub.ok && sub.outcome === "pending" && sub.draftId);
  assert.equal(posts.length, 0);
  const id = (sub as { draftId: number }).draftId;
  // a non-senior, and the author, cannot approve
  assert.equal((await f.approveDraftNews({ actor: A("ir@kefi.com"), draftId: id, override: false, post })).ok, false);
  const own = await p.createDraft({ orgId: org, cardId: card, kind: "rns", text: "x", link, groups: [], createdBy: "ceo@kefi.com", websiteStatus: "found" });
  const ownTry = await f.approveDraftNews({ actor: A("ceo@kefi.com"), draftId: own, override: false, post });
  assert.equal(ownTry.ok === false && ownTry.code, "own_draft");
  // a different senior approves: it goes out once
  assert.equal((await f.approveDraftNews({ actor: A("cfo@kefi.com"), draftId: id, override: false, post })).ok, true);
  assert.equal(posts.length, 1);
  const again = await f.approveDraftNews({ actor: A("ceo@kefi.com"), draftId: id, override: false, post });
  assert.equal(again.ok === false && again.code, "gone");
  assert.equal(posts.length, 1, "approving twice does not post twice");
  // the trail shows who wrote and who approved
  const trail = await p.listAudit(org);
  assert.ok(trail.some((t) => t.action === "submitted" && t.actor === "ir@kefi.com"));
  const approved = trail.find((t) => t.action === "approved");
  assert.equal(approved?.actor, "cfo@kefi.com"); assert.equal(approved?.detail.writtenBy, "ir@kefi.com");
  // rejection and writing your own draft's withdrawal are recorded
  const d2 = await p.createDraft({ orgId: org, cardId: card, kind: "rns", text: "y", link, groups: [], createdBy: "ir@kefi.com", websiteStatus: "found" });
  assert.equal((await f.rejectDraftNews({ actor: A("cfo@kefi.com"), draftId: d2, note: "not yet public" })).ok, true);
  assert.ok((await p.listAudit(org)).some((t) => t.action === "rejected"));
  // when the only senior admin is the author, nobody else can approve
  await db`UPDATE tapcard_biz_admins SET senior = false WHERE org_id = ${org} AND email = 'cfo@kefi.com'`;
  const stuck = await f.submitNews({ actor: A("ceo@kefi.com"), cardId: card, kind: "rns", text: "z", link, groups: [], override: false, post });
  assert.equal(stuck.ok === false && stuck.code, "no_approver");
  // and the last senior cannot be removed
  assert.equal((await p.setSenior(org, "ceo@kefi.com", false)).ok, false);
});
