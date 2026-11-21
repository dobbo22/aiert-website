import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";

installStubs();

const U = (id: string, parent_id: string | null) => ({ id, parent_id });

test("tree helpers: ancestors, descendants, loops and depth", async () => {
  const t = await import("../lib/tapcardUnits");
  const units = [U("top", null), U("mid", "top"), U("low", "mid"), U("other", null)];
  assert.deepEqual(t.ancestorsOf(units, "low"), ["low", "mid", "top"]);
  assert.deepEqual(t.descendantsOf(units, "top").sort(), ["low", "mid", "top"]);
  assert.ok(t.moveProblem(units, "top", "low"), "a group cannot move under its own descendant");
  assert.ok(t.moveProblem(units, "mid", "mid"));
  assert.equal(t.moveProblem(units, "low", "other"), null);
  assert.equal(t.moveProblem(units, "mid", null), null);
  assert.ok(t.ownsAtOrAbove(units, ["top"], "low"));
  assert.ok(!t.ownsAtOrAbove(units, ["other"], "low"));
  assert.ok(!t.ownsAtOrAbove(units, [], "low"));
  // Depth: a long chain refuses one more level.
  const chain = Array.from({ length: t.MAX_UNIT_DEPTH }, (_, i) => U(`c${i}`, i ? `c${i - 1}` : null));
  assert.ok(t.moveProblem([...chain, U("x", null)], "x", `c${t.MAX_UNIT_DEPTH - 1}`));
});

test("owners post for everything below their group; a change of owner moves the rights at once", async () => {
  const t = await import("../lib/tapcardUnits");
  const biz = await import("../lib/tapcardBiz");
  await (await import("../lib/tapcardDb")).getCard("none"); // creates the card tables
  await biz.listOrgCards("org1");
  const mk = (id: string, kind: string, org = "org1") =>
    db`INSERT INTO tapcard_cards (id, name, company, org_id, card_kind, label, edit_token_hash) VALUES (${id}, ${id}, ${id}, ${org}, ${kind}, 'Business', 'h') ON CONFLICT DO NOTHING`;
  await mk("senior", "person"); await mk("cameron", "person"); await mk("sam", "person");
  await mk("champions", "business"); await mk("ossies", "business"); await mk("elsewhere", "business", "org2");

  const top = (await t.createUnit("org1", "Senior management", null)) as { id: string };
  const lounges = (await t.createUnit("org1", "Lounges", top.id)) as { id: string };
  const champ = (await t.createUnit("org1", "Champions", lounges.id)) as { id: string };
  const oss = (await t.createUnit("org1", "Ossies", lounges.id)) as { id: string };
  assert.ok((await t.assignCard("org1", "champions", champ.id)).ok);
  assert.ok((await t.assignCard("org1", "ossies", oss.id)).ok);
  assert.ok(!(await t.assignCard("org1", "elsewhere", champ.id)).ok, "another company's card is refused");
  assert.ok(!(await t.setUnitOwner("org1", top.id, "elsewhere")).ok, "another company's card cannot own a group");

  assert.ok((await t.setUnitOwner("org1", top.id, "senior")).ok);
  assert.ok((await t.setUnitOwner("org1", champ.id, "cameron")).ok);

  assert.equal(await biz.posterMayPostFor("senior", "champions"), true, "senior management posts for every lounge below");
  assert.equal(await biz.posterMayPostFor("senior", "ossies"), true);
  assert.equal(await biz.posterMayPostFor("cameron", "champions"), true);
  assert.equal(await biz.posterMayPostFor("cameron", "ossies"), false, "a lounge owner does not reach a sibling lounge");
  assert.equal(await biz.posterMayPostFor("sam", "champions"), false);
  assert.deepEqual((await biz.postTargetsFor("senior")).map((x) => x.id).sort(), ["champions", "ossies"]);
  assert.deepEqual((await biz.postTargetsFor("cameron")).map((x) => x.id), ["champions"]);

  // Cameron moves lounge: the admin sets a new owner for Champions and gives him Ossies.
  assert.ok((await t.setUnitOwner("org1", champ.id, "sam")).ok);
  assert.ok((await t.setUnitOwner("org1", oss.id, "cameron")).ok);
  assert.equal(await biz.posterMayPostFor("cameron", "champions"), false);
  assert.equal(await biz.posterMayPostFor("sam", "champions"), true);
  assert.equal(await biz.posterMayPostFor("cameron", "ossies"), true);

  // Moving a whole group under another parent moves the rights with it; removing the owner removes them.
  const other = (await t.createUnit("org1", "Hospitality", null)) as { id: string };
  assert.ok((await t.moveUnit("org1", lounges.id, other.id)).ok);
  assert.equal(await biz.posterMayPostFor("senior", "champions"), false, "lounges left senior management's branch");
  assert.ok((await t.setUnitOwner("org1", other.id, "senior")).ok);
  assert.equal(await biz.posterMayPostFor("senior", "champions"), true);
  assert.ok((await t.setUnitOwner("org1", other.id, null)).ok);
  assert.equal(await biz.posterMayPostFor("senior", "champions"), false);

  // Can't remove a group that still has groups under it; removing a leaf unassigns its card.
  assert.ok(!(await t.deleteUnit("org1", lounges.id)).ok);
  assert.ok((await t.deleteUnit("org1", champ.id)).ok);
  assert.equal(await biz.posterMayPostFor("sam", "champions"), false);
  const loop = await t.moveUnit("org1", other.id, champ.id);
  assert.ok(!loop.ok);
});

test("rolled-up follower counts include the groups below", async () => {
  const t = await import("../lib/tapcardUnits");
  await (await import("../lib/tapcardPush")).ensureSchema();
  await (await import("../lib/tapcardOffers")).ensureOfferSchema();
  await db`INSERT INTO tapcard_followers (card_id, follower_hash) VALUES ('ossies','a'), ('ossies','b') ON CONFLICT DO NOTHING`;
  const units = await t.listUnits("org1");
  const lounges = units.find((u) => u.name === "Lounges")!;
  const hosp = units.find((u) => u.name === "Hospitality")!;
  const r = await t.rolledUpFollowers("org1");
  assert.equal(r[lounges.id], 2);
  assert.equal(r[hosp.id], 2);
});
