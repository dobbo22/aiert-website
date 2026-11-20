import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";
installStubs();

// An offer limited to a group (extra tickets for #Ossies): only a follower who joined that group can claim it; everyone else is
// refused with the group's name; an unknown group never turns into "everyone"; an offer with no groups still works for anyone.
test("a group offer can be claimed only by a member of that group", async () => {
  const g = await import("../lib/tapcardGroups");
  const o = await import("../lib/tapcardOffers");
  const { hashSecret } = await import("../lib/tapcardAuth");
  const card = "card-lounges";
  assert.ok((await g.addGroup(card, "#Ossies")).ok);
  assert.ok((await g.addGroup(card, "#Captains")).ok);

  // unknown group: refused, never widened
  const bad = await o.setOffer(card, { text: "Extra tickets", pin: "4821" }, "admin", ["nosuchgroup"]);
  assert.equal(bad.ok, false);

  const made = await o.setOffer(card, { text: "Extra tickets for Saturday", pin: "4821" }, "admin", ["ossies"]);
  assert.ok(made.ok);

  const member = "install-member-0000000001", captain = "install-captain-000000001", stranger = "install-stranger-00000001";
  await g.joinGroup(card, hashSecret(`tapcard-follower:${member}`), "ossies");
  await g.joinGroup(card, hashSecret(`tapcard-follower:${captain}`), "captains");

  // Fully hidden: the public, a stranger, a member of another group and an older app (no id) see no offer and no hint of one.
  assert.equal(await o.publicOffer(card), null);
  assert.equal(await o.publicOffer(card, {}), null);
  assert.equal(await o.publicOffer(card, { install: stranger }), null);
  assert.equal(await o.publicOffer(card, { install: captain }), null);
  assert.equal(await o.offerIsLimited(card), true, "the response must not be shared between viewers");
  // A recognised member sees it, with who it is for; the owner or an admin always does.
  const seen = await o.publicOffer(card, { install: member });
  assert.equal(seen?.text, "Extra tickets for Saturday");
  assert.deepEqual((seen as { forGroups?: { slug: string; label: string }[] }).forGroups, [{ slug: "ossies", label: "Ossies" }]);
  assert.equal((await o.publicOffer(card, { owner: true }))?.text, "Extra tickets for Saturday");

  const ok = await o.claimOffer(card, member, "app");
  assert.equal(ok.ok, true);
  const again = await o.claimOffer(card, member, "app");
  assert.equal(again.ok && ok.ok && again.code === ok.code, true, "the same person gets the same code back");

  for (const who of [captain, stranger]) {
    const r = await o.claimOffer(card, who, "app");
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.error, "not_in_audience");
    assert.deepEqual(!r.ok && r.groups, ["Ossies"]);
  }
  const web = await o.claimOffer(card, "web-visitor-00000000001", "web");
  assert.equal(web.ok, false);
});

test("an offer with no groups is for everyone, as before", async () => {
  const o = await import("../lib/tapcardOffers");
  const card = "card-everyone";
  assert.ok((await o.setOffer(card, { text: "Free coffee", pin: "1234" })).ok);
  const pub = await o.publicOffer(card);
  assert.equal(pub?.text, "Free coffee", "an offer with no groups is visible to everyone");
  assert.equal("forGroups" in (pub ?? {}), false);
  assert.equal(await o.offerIsLimited(card), false);
  const r = await o.claimOffer(card, "anybody-install-000000001", "web");
  assert.equal(r.ok, true);
  await db`SELECT 1`;
});

// A card runs several offers at once, at most one per audience: one for everyone, and one for each group (or set of groups).
test("several offers run side by side, one per audience", async () => {
  const g = await import("../lib/tapcardGroups");
  const o = await import("../lib/tapcardOffers");
  const { hashSecret } = await import("../lib/tapcardAuth");
  const card = "card-multi";
  // codeStatus names the card, so the cards table must exist in this stand-in database.
  await db`CREATE TABLE IF NOT EXISTS tapcard_cards (id TEXT PRIMARY KEY, name TEXT, company TEXT)`;
  await db`INSERT INTO tapcard_cards (id, name, company) VALUES (${card}, 'Cameron', 'Chelsea FC') ON CONFLICT DO NOTHING`;
  await g.addGroup(card, "#Ossies");
  await g.addGroup(card, "#Champions");
  const ossie = "install-ossie-0000000001", champ = "install-champ-0000000001", both = "install-both-00000000001", stranger = "install-stranger-00000009";
  for (const [who, slugs] of [[ossie, ["ossies"]], [champ, ["champions"]], [both, ["ossies", "champions"]]] as const) {
    for (const slug of slugs) await g.joinGroup(card, hashSecret(`tapcard-follower:${who}`), slug);
  }

  const pub = await o.setOffer(card, { text: "Free coffee", pin: "1111" });
  const oss = await o.setOffer(card, { text: "Extra tickets for Ossies", pin: "2222" }, "admin", ["ossies"]);
  const cha = await o.setOffer(card, { text: "Champagne for Champions", pin: "3333" }, "admin", ["champions"]);
  assert.ok(pub.ok && oss.ok && cha.ok);
  assert.equal((await o.liveOffers(card)).length, 3);

  const texts = async (viewer?: { install?: string; owner?: boolean }) => (await o.publicOffers(card, viewer)).map((x) => x.text);
  assert.deepEqual(await texts(), ["Free coffee"], "the public sees only the public offer");
  assert.deepEqual(await texts({ install: stranger }), ["Free coffee"]);
  assert.deepEqual(await texts({ install: ossie }), ["Extra tickets for Ossies", "Free coffee"], "a member's group offer comes first");
  assert.deepEqual(await texts({ install: champ }), ["Champagne for Champions", "Free coffee"]);
  assert.deepEqual(await texts({ install: both }), ["Champagne for Champions", "Extra tickets for Ossies", "Free coffee"]);
  assert.deepEqual(await texts({ owner: true }), ["Free coffee", "Champagne for Champions", "Extra tickets for Ossies"], "the owner sees the public one first");
  assert.equal((await o.publicOffer(card, { install: ossie }))?.text, "Extra tickets for Ossies");
  assert.equal((await o.publicOffer(card))?.text, "Free coffee");

  // claiming: the right offer for each phone, or the one asked for
  const c1 = await o.claimOffer(card, ossie, "app");
  assert.ok(c1.ok);
  const asked = await o.claimOffer(card, ossie, "app", Number(pub.ok && pub.id));
  assert.ok(asked.ok && c1.ok && asked.code !== c1.code, "a member can also claim the public offer by asking for it");
  const wrong = await o.claimOffer(card, champ, "app", Number(oss.ok && oss.id));
  assert.equal(!wrong.ok && wrong.error, "not_in_audience");
  const strangerGets = await o.claimOffer(card, stranger, "app");
  assert.ok(strangerGets.ok, "a stranger's default claim is the public offer");

  // posting again to the same audience replaces only that audience's offer
  const oss2 = await o.setOffer(card, { text: "More Ossies tickets", pin: "2222" }, "admin", ["ossies"]);
  assert.ok(oss2.ok);
  assert.equal((await o.liveOffers(card)).length, 3);
  assert.equal((await o.codeStatus(c1.ok ? c1.code : "")).state, "replaced", "the replaced Ossies offer's codes stop working");
  const champCode = await o.claimOffer(card, champ, "app");
  assert.equal((await o.codeStatus(champCode.ok ? champCode.code : "")).state, "valid", "the Champions offer is untouched");
  assert.equal((await o.codeStatus(asked.ok ? asked.code : "")).state, "valid", "so is the public offer");

  // withdrawing: the public one only, then one by id, then everything
  await o.clearOffers(card, []);
  assert.deepEqual((await o.liveOffers(card)).map((x) => x.text).sort(), ["Champagne for Champions", "More Ossies tickets"]);
  assert.equal(await o.withdrawOfferById(card, Number(cha.ok && cha.id)), true);
  assert.deepEqual((await o.liveOffers(card)).map((x) => x.text), ["More Ossies tickets"]);
  assert.equal(await o.offerIsLimited(card), true);
  await o.clearOffers(card);
  assert.equal((await o.liveOffers(card)).length, 0);
  assert.equal(await o.offerIsLimited(card), false);
});
