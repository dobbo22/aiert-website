import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";
installStubs();

// The usage report is counts only. It must count the right things for one company, never another's, and a link must work, be traceable
// by when it was used, and stop working once revoked.
test("usage figures for one company, counts only, and revocable links", async () => {
  await db`CREATE TABLE tapcard_biz_orgs (id TEXT PRIMARY KEY, name TEXT, seat_limit INT, locations INT)`;
  await db`CREATE TABLE tapcard_cards (id TEXT PRIMARY KEY, name TEXT, org_id TEXT, card_kind TEXT, view_count INT DEFAULT 0, qr_view_count INT DEFAULT 0, save_count INT DEFAULT 0)`;
  await db`INSERT INTO tapcard_biz_orgs VALUES ('org1', 'Chelsea FC', 11, 1), ('org2', 'Other Co', 11, 1)`;
  await db`INSERT INTO tapcard_cards (id, name, org_id, card_kind, view_count, qr_view_count, save_count) VALUES
    ('c1', 'Cameron', 'org1', 'person', 10, 4, 2), ('c2', 'Matthew', 'org1', 'person', 0, 0, 0), ('c3', 'Lounge', 'org1', 'business', 5, 5, 0), ('x1', 'Other', 'org2', 'person', 99, 99, 99)`;

  const g = await import("../lib/tapcardGroups");
  const o = await import("../lib/tapcardOffers");
  await g.addGroup("c1", "#Ossies");
  await g.addGroup("c1", "#Champions");
  await g.addGroup("c3", "#Ossies"); // the same label on a second card is one row in the report
  await o.setFollower("c1", "install-a-0000000000001", true);
  await o.setFollower("c1", "install-b-0000000000001", true);
  await o.setFollower("c3", "install-c-0000000000001", true);
  await o.setFollower("x1", "install-z-0000000000001", true); // another company's follower
  await db`UPDATE tapcard_followers SET created_at = now() - interval '90 days' WHERE card_id = 'c3'`;
  await g.joinGroup("c1", (await import("../lib/tapcardAuth")).hashSecret("tapcard-follower:install-a-0000000000001"), "ossies");
  await g.joinGroup("c3", (await import("../lib/tapcardAuth")).hashSecret("tapcard-follower:install-c-0000000000001"), "ossies");
  await o.recordInstall("c1", "install-a-0000000000001", "android");
  await o.setOffer("c1", { text: "Free coffee", pin: "1111" });
  await o.setOffer("c1", { text: "Ossies tickets", pin: "2222" }, "admin", ["ossies"]);
  await o.claimOffer("c1", "install-a-0000000000001", "app");
  await o.setAnnouncement("c1", "Lounge opens at six");

  const { orgUsage, usageCsv } = await import("../lib/tapcardUsage");
  const r = await orgUsage("org1");
  assert.ok(r);
  assert.equal(r.company, "Chelsea FC");
  assert.deepEqual(r.cards, { issued: 3, limit: 11, locations: 1, staff: 2, inUse: 2 }, "Matthew has no activity yet, so he is issued but not in use");
  assert.equal(r.followers.total, 3);
  assert.equal(r.followers.last30, 2, "the 90-day-old follow is not recent");
  assert.deepEqual(r.reach, { views: 15, qrScans: 9, saves: 2, installs: 1 }, "another company's 99s are not counted");
  assert.equal(r.offers.liveNow, 2);
  assert.equal(r.offers.posted, 2);
  assert.equal(r.offers.claims, 1);
  assert.equal(r.offers.used, 0);
  assert.equal(r.news.posted, 1);
  assert.deepEqual(r.groups, [{ label: "Ossies", cards: 2, followers: 2 }, { label: "Champions", cards: 1, followers: 0 }]);
  assert.equal(await orgUsage("nope"), null);

  // counts only: nothing that names or identifies a person
  const json = JSON.stringify(r);
  for (const word of ["Cameron", "Matthew", "install-", "@"]) assert.equal(json.includes(word), false, `report must not contain ${word}`);
  const csv = usageCsv(r);
  assert.match(csv, /"Cards issued","3"/);
  assert.match(csv, /"Group: Ossies \(followers\)","2"/);

  // links
  const u = await import("../lib/tapcardUsage");
  const made = await u.createUsageLink("org1", "cameron@chelseafc.com", "Finance");
  assert.ok(made.ok);
  const token = made.ok ? made.token : "";
  assert.equal((await u.usageForToken(token))?.company, "Chelsea FC");
  assert.equal(await u.usageForToken("not-a-real-token-at-all-0000"), null);
  const list = await u.listUsageLinks("org1");
  assert.equal(list.length, 1);
  assert.ok(list[0].lastUsedAt, "use is recorded");
  assert.equal(JSON.stringify(list).includes(token), false, "the address is never stored or listed");
  assert.equal(await u.revokeUsageLink("org2", list[0].id), false, "another company cannot revoke it");
  assert.equal(await u.revokeUsageLink("org1", list[0].id), true);
  assert.equal(await u.usageForToken(token), null, "a revoked link stops working");
  // at most five at a time
  for (let i = 0; i < 5; i++) assert.ok((await u.createUsageLink("org1", "a")).ok);
  assert.equal((await u.createUsageLink("org1", "a")).ok, false);
});
