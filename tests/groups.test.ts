import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { installStubs, sql as db } from "./helpers/pgdb";

const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.FCM_SA_JSON = JSON.stringify({ client_email: "t@t.iam", project_id: "p", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) });
installStubs();

const sentTo: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string, init?: { body?: unknown }) => {
  if (String(url).includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "a", expires_in: 3000 }));
  if (String(url).includes("fcm.googleapis.com")) { sentTo.push(JSON.parse(String(init?.body)).message.token); return new Response("{}"); }
  return realFetch(url as never, init as never);
}) as typeof fetch;

test("group names are tidied into a label and a safe slug", async () => {
  const { cleanGroupLabel } = await import("../lib/tapcardGroups");
  assert.deepEqual(cleanGroupLabel("#IPO  Clients"), { label: "IPO Clients", slug: "ipo-clients" });
  assert.deepEqual(cleanGroupLabel("Kefi"), { label: "Kefi", slug: "kefi" });
  assert.equal(cleanGroupLabel("###"), null);
  assert.equal(cleanGroupLabel(42), null);
});

test("a news send goes only to the chosen group; no groups means everyone; unfollowing clears the label", async () => {
  const g = await import("../lib/tapcardGroups");
  const { pushToFollowers } = await import("../lib/tapcardPush");
  const card = "card-ifc";
  assert.ok((await g.addGroup(card, "#Kefi")).ok);
  assert.ok((await g.addGroup(card, "IPO Clients")).ok);
  assert.ok((await g.addGroup(card, "kefi")).ok, "adding the same group twice is harmless");
  assert.equal((await g.listGroups(card)).length, 2);

  // three followers with a phone each: A in Kefi, B in IPO Clients, C in neither
  const ensure = (await import("../lib/tapcardPush")).setPushPrefs;
  for (const [h, tok] of [["hA", "tokA"], ["hB", "tokB"], ["hC", "tokC"]]) {
    await ensure(card, h, true); // creates the push tables
    await db`INSERT INTO tapcard_push_devices (follower_hash, platform, token) VALUES (${h}, 'android', ${tok}) ON CONFLICT DO NOTHING`;
    await db`INSERT INTO tapcard_push_prefs (card_id, follower_hash) VALUES (${card}, ${h}) ON CONFLICT DO NOTHING`;
  }
  assert.equal((await g.joinGroup(card, "hA", "kefi"))?.label, "Kefi");
  assert.equal((await g.joinGroup(card, "hB", "ipo-clients"))?.label, "IPO Clients");
  assert.equal(await g.joinGroup(card, "hC", "made-up"), null, "an unknown group adds nothing");

  const a1 = await g.validAudience(card, ["kefi"]);
  assert.ok(a1.ok);
  assert.equal((await g.validAudience(card, ["nope"])).ok, false, "a bad group must not turn into everyone");
  assert.equal((await g.validAudience(card, ["kefi", "nope"])).ok, false);

  sentTo.length = 0;
  await db`DELETE FROM tapcard_push_log`; // the weekly cap is not what is being tested here
  await pushToFollowers(card, "news", { title: "t", body: "b", ref: "1", groups: ["kefi"] });
  assert.deepEqual(sentTo.sort(), ["tokA"]);

  sentTo.length = 0;
  await db`DELETE FROM tapcard_push_log`; // the weekly cap is not what is being tested here
  await pushToFollowers(card, "news", { title: "t", body: "b", ref: "2", groups: ["kefi", "ipo-clients"] });
  assert.deepEqual(sentTo.sort(), ["tokA", "tokB"]);

  sentTo.length = 0;
  await db`DELETE FROM tapcard_push_log`; // the weekly cap is not what is being tested here
  await pushToFollowers(card, "news", { title: "t", body: "b", ref: "3" });
  assert.deepEqual(sentTo.sort(), ["tokA", "tokB", "tokC"], "no audience = every follower");

  await db`INSERT INTO tapcard_followers (card_id, follower_hash) VALUES (${card}, 'hA'), (${card}, 'hB') ON CONFLICT DO NOTHING`.catch(async () => { await (await import("../lib/tapcardOffers")).setFollower(card, "x-seed-follower-1", true); });
  const counts = await g.listGroupsWithCounts(card);
  assert.ok(counts.every((c) => typeof c.members === "number" && typeof c.reachable === "number"), "the admin sees member and reachable counts");

  await g.leaveAllGroups(card, "hA");
  sentTo.length = 0;
  await db`DELETE FROM tapcard_push_log`; // the weekly cap is not what is being tested here
  await pushToFollowers(card, "news", { title: "t", body: "b", ref: "4", groups: ["kefi"] });
  assert.deepEqual(sentTo, [], "after unfollowing nobody is in the group");

  await g.removeGroup(card, "ipo-clients");
  assert.deepEqual((await g.listGroups(card)).map((x) => x.slug), ["kefi"]);
});
