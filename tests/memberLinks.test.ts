import test from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql as db } from "./helpers/pgdb";

installStubs();

const TOKEN_A = "memberTokenAAAAAAAA1";
const TOKEN_B = "memberTokenBBBBBBBB2";

test("a token is 16 to 64 safe characters; anything else is ignored", async () => {
  const { cleanMemberToken } = await import("../lib/tapcardMemberLinks");
  assert.equal(cleanMemberToken(TOKEN_A), TOKEN_A);
  assert.equal(cleanMemberToken("short"), "");
  assert.equal(cleanMemberToken("has spaces in it 12345"), "");
  assert.equal(cleanMemberToken("a@b.com-12345678901"), "");
  assert.equal(cleanMemberToken(12345), "");
  assert.equal(cleanMemberToken("x".repeat(65)), "");
});

test("nothing is recorded for a company that has not been switched on", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  const r = await m.recordFollowEvent({ orgId: "org-off", cardId: "c1", followerHash: "h1", follow: true, token: TOKEN_A, group: "" });
  assert.equal(r.outcome, "off");
  assert.equal((await m.recordFollowEvent({ orgId: null, cardId: "c1", followerHash: "h1", follow: true, token: TOKEN_A, group: "" })).outcome, "off");
  assert.equal(await m.recordClaimEvent({ orgId: "org-off", cardId: "c1", claimantHash: "h1" }), null);
  assert.equal(((await db`SELECT count(*)::int AS n FROM tapcard_member_events WHERE org_id = 'org-off'`) as { n: number }[])[0].n, 0);
});

test("a phone links to a token once; repeats are quiet; a second phone is refused; unfollowing frees it", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  await m.enableMemberLinks("org-cfc", "test");
  const base = { orgId: "org-cfc", cardId: "card-cam" };
  const events = async () => (await db`SELECT event, token, group_slug FROM tapcard_member_events WHERE org_id = 'org-cfc' ORDER BY id`) as { event: string; token: string; group_slug: string }[];

  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone1", follow: true, token: TOKEN_A, group: "champions" })).outcome, "linked");
  assert.deepEqual((await events()).map((e) => e.event), ["follow", "group_joined"]);
  assert.equal((await events())[1].group_slug, "champions");

  // the app re-sends its follow every time it opens: no new events
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone1", follow: true, token: TOKEN_A, group: "champions" })).outcome, "unchanged");
  assert.equal((await events()).length, 2);

  // joining another lounge through the same link is news
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone1", follow: true, token: TOKEN_A, group: "ossies" })).outcome, "linked");
  assert.deepEqual((await events()).map((e) => e.event), ["follow", "group_joined", "group_joined"]);

  // a second phone presenting the same token is refused and records nothing
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone2", follow: true, token: TOKEN_A, group: "" })).outcome, "conflict");
  assert.equal((await events()).length, 3);

  // a follow with no token, or a bad one, is just an ordinary follow
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone3", follow: true, token: undefined, group: "" })).outcome, "ignored");
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone3", follow: true, token: "nope", group: "" })).outcome, "ignored");

  // unfollowing records the token and frees it for a reinstalled app
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone1", follow: false, token: undefined, group: "" })).outcome, "unlinked");
  assert.equal((await events()).at(-1)?.event, "unfollow");
  assert.equal((await events()).at(-1)?.token, TOKEN_A);
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone2", follow: true, token: TOKEN_A, group: "" })).outcome, "linked");
  // unfollowing a phone that was never linked says nothing
  assert.equal((await m.recordFollowEvent({ ...base, followerHash: "phone9", follow: false, token: undefined, group: "" })).outcome, "ignored");
});

test("a claim by a linked phone is recorded once an hour; an unlinked phone records nothing", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  assert.equal((await m.recordFollowEvent({ orgId: "org-cfc", cardId: "card-cam", followerHash: "phoneB", follow: true, token: TOKEN_B, group: "managers" })).outcome, "linked");
  const first = await m.recordClaimEvent({ orgId: "org-cfc", cardId: "card-cam", claimantHash: "phoneB" });
  assert.ok(first);
  assert.equal(await m.recordClaimEvent({ orgId: "org-cfc", cardId: "card-cam", claimantHash: "phoneB" }), null, "asking for the same code again is not a new claim");
  assert.equal(await m.recordClaimEvent({ orgId: "org-cfc", cardId: "card-cam", claimantHash: "stranger" }), null);
});

test("the signature verifies, and fails for a changed body, wrong secret or an old time", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  const secret = m.webhookSecret("org-cfc", 1);
  assert.notEqual(secret, m.webhookSecret("org-cfc", 2), "rotating changes the secret");
  assert.notEqual(secret, m.webhookSecret("org-other", 1));
  const now = Math.floor(Date.now() / 1000);
  const h = m.signBody(secret, '{"a":1}', now);
  assert.ok(m.verifySignature(secret, '{"a":1}', h, now));
  assert.equal(m.verifySignature(secret, '{"a":2}', h, now), false);
  assert.equal(m.verifySignature(m.webhookSecret("org-cfc", 2), '{"a":1}', h, now), false);
  assert.equal(m.verifySignature(secret, '{"a":1}', h, now + 3600), false, "a replayed old message is refused");
  assert.equal(m.verifySignature(secret, '{"a":1}', "garbage", now), false);
});

test("only a public https address is accepted for events", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  m.deps.isPublic = async (host) => host === "members.chelsea.example";
  assert.deepEqual(await m.cleanWebhookUrl("https://members.chelsea.example/hook"), { ok: true, url: "https://members.chelsea.example/hook" });
  assert.equal((await m.cleanWebhookUrl("http://members.chelsea.example/hook")).ok, false);
  assert.equal((await m.cleanWebhookUrl("https://user:pw@members.chelsea.example/hook")).ok, false);
  assert.equal((await m.cleanWebhookUrl("https://members.chelsea.example:8443/hook")).ok, false);
  assert.equal((await m.cleanWebhookUrl("https://localhost/hook")).ok, false, "internal addresses are refused");
  assert.equal((await m.cleanWebhookUrl("")).ok, false);
  assert.equal((await m.cleanWebhookUrl("not a url")).ok, false);
});

test("events are sent signed, retried with backoff when the receiver fails, and marked delivered when it answers", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  m.deps.isPublic = async () => true;
  await m.setWebhook("org-cfc", "https://members.chelsea.example/hook");
  await db`DELETE FROM tapcard_member_events WHERE org_id = 'org-cfc'`;
  await m.recordFollowEvent({ orgId: "org-cfc", cardId: "card-cam", followerHash: "phoneC", follow: true, token: "memberTokenCCCCCCCC3", group: "" });

  let answer = 500;
  const seen: { headers: Record<string, string>; body: string }[] = [];
  m.deps.fetch = (async (_u: unknown, init: { headers: Record<string, string>; body: string }) => { seen.push({ headers: init.headers, body: init.body }); return new Response("", { status: answer }); }) as unknown as typeof fetch;

  assert.deepEqual(await m.deliverDue(), { sent: 0, failed: 1 });
  type R = { attempts: number; delivered_at: unknown; last_status: number; later: boolean };
  let row = ((await db`SELECT attempts, delivered_at, last_status, next_attempt_at > now() AS later FROM tapcard_member_events WHERE org_id = 'org-cfc'`) as R[])[0];
  assert.equal(row.attempts, 1); assert.equal(row.delivered_at, null); assert.equal(row.last_status, 500); assert.equal(row.later, true);
  // not due yet: nothing is sent again straight away
  assert.deepEqual(await m.deliverDue(), { sent: 0, failed: 0 });

  await db`UPDATE tapcard_member_events SET next_attempt_at = now() WHERE org_id = 'org-cfc'`;
  answer = 200;
  assert.deepEqual(await m.deliverDue(), { sent: 1, failed: 0 });
  row = ((await db`SELECT attempts, delivered_at FROM tapcard_member_events WHERE org_id = 'org-cfc'`) as R[])[0];
  assert.equal(row.attempts, 2); assert.ok(row.delivered_at);

  const last = seen.at(-1)!;
  assert.ok(m.verifySignature(m.webhookSecret("org-cfc", 1), last.body, last.headers["x-tapcard-signature"]));
  const sent = JSON.parse(last.body);
  assert.equal(sent.event, "follow"); assert.equal(sent.token, "memberTokenCCCCCCCC3");
  assert.equal(Object.keys(sent).some((k) => /name|email|member/i.test(k)), false, "nothing that identifies a person is sent");
});

test("a company with no address keeps events for collection and nothing is sent", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  await m.enableMemberLinks("org-pull", "test");
  let calls = 0;
  m.deps.fetch = (async () => { calls++; return new Response("", { status: 200 }); }) as unknown as typeof fetch;
  await m.recordFollowEvent({ orgId: "org-pull", cardId: "card-p", followerHash: "hp1", follow: true, token: "memberTokenPPPPPPPP4", group: "" });
  assert.deepEqual(await m.deliverDue(), { sent: 0, failed: 0 });
  assert.equal(calls, 0);
});

test("keys: shown once, found by hash, limited to five, revocable, and tied to their own company", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  const made = await m.createMemberKey("org-pull", "admin@x.test", "CRM");
  assert.ok(made.ok);
  if (!made.ok) return;
  assert.match(made.key, /^tcm_/);
  assert.equal(await m.orgForKey(`Bearer ${made.key}`), "org-pull");
  assert.equal(await m.orgForKey(`Bearer ${made.key}x`), null);
  assert.equal(await m.orgForKey(null), null);
  const stored = JSON.stringify(await db`SELECT * FROM tapcard_member_keys`);
  assert.equal(stored.includes(made.key), false, "the key itself is never stored");
  for (let i = 0; i < 4; i++) assert.ok((await m.createMemberKey("org-pull", "a", `k${i}`)).ok);
  assert.equal((await m.createMemberKey("org-pull", "a", "sixth")).ok, false);
  const keys = await m.listMemberKeys("org-pull");
  assert.equal(await m.revokeMemberKey("org-cfc", keys[0].id), false, "another company cannot revoke it");
  assert.ok(await m.revokeMemberKey("org-pull", keys[0].id));
  assert.equal(await m.revokeMemberKey("org-pull", keys[0].id), false);
});

test("collecting events: oldest first, by cursor, only the company's own, test events left out", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  const first = await m.eventsAfter("org-pull", 0);
  assert.equal(first.events.length, 1);
  assert.equal(first.events[0].event, "follow");
  assert.equal(first.events[0].token, "memberTokenPPPPPPPP4");
  assert.equal((await m.eventsAfter("org-pull", first.next)).events.length, 0, "nothing after the cursor");
  assert.ok((await m.eventsAfter("org-pull", 0, 500, "2000-01-01T00:00:00Z")).events.length >= 1);
  assert.equal((await m.eventsAfter("org-cfc", 0)).events.every((e) => e.token !== "memberTokenPPPPPPPP4"), true, "never another company's events");
  await db`INSERT INTO tapcard_member_events (org_id, token, event) VALUES ('org-pull', 'test-event-not-a-member', 'test')`;
  assert.equal((await m.eventsAfter("org-pull", 0)).events.some((e) => e.event === "test"), false);
});

test("housekeeping removes events older than 90 days", async () => {
  const m = await import("../lib/tapcardMemberLinks");
  await db`INSERT INTO tapcard_member_events (org_id, token, event, created_at) VALUES ('org-old', 'memberTokenOLDOLDOLD5', 'follow', now() - interval '91 days')`;
  await db`INSERT INTO tapcard_member_events (org_id, token, event, created_at) VALUES ('org-old', 'memberTokenNEWNEWNEW6', 'follow', now() - interval '10 days')`;
  const r = await m.purgeMemberLinks();
  assert.ok(r.events >= 1);
  assert.equal(((await db`SELECT count(*)::int AS n FROM tapcard_member_events WHERE org_id = 'org-old'`) as { n: number }[])[0].n, 1);
});
