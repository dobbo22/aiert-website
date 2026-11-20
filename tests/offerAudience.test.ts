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

  // the public offer says who it is for
  const pub = await o.publicOffer(card);
  assert.deepEqual((pub as { forGroups?: { slug: string; label: string }[] }).forGroups, [{ slug: "ossies", label: "Ossies" }]);

  const member = "install-member-0000000001", captain = "install-captain-000000001", stranger = "install-stranger-00000001";
  await g.joinGroup(card, hashSecret(`tapcard-follower:${member}`), "ossies");
  await g.joinGroup(card, hashSecret(`tapcard-follower:${captain}`), "captains");

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
  assert.equal("forGroups" in (pub ?? {}), false);
  const r = await o.claimOffer(card, "anybody-install-000000001", "web");
  assert.equal(r.ok, true);
  await db`SELECT 1`;
});
