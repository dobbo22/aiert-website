import { before, test } from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql } from "./helpers/pgdb";
installStubs();

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

async function newListedCompany(name: string, token: string) {
  const { createManagedCompany } = await import("../lib/tapcardBizSupport");
  const { createCard } = await import("../lib/tapcardDb");
  const { hashSecret } = await import("../lib/tapcardAuth");
  const { isListedCard } = await import("../lib/tapcardShare");
  const org = await createManagedCompany({ name, adminEmail: `a@${token}.example`, locations: 1 });
  const card = await createCard({
    label: "Business", grouping_id: "", name, title: "", company: name, phone: "", email: "", website: "", address: "",
    linkedin_url: "", twitter_url: "", instagram_url: "", facebook_url: "", facebook_is_page: false, tiktok_url: "", whatsapp_url: "", photo_url: null,
  } as never, hashSecret(token), "iphash");
  const cardId = typeof card === "string" ? card : (card as { id: string }).id;
  await isListedCard("none"); // creates the listed tables
  await sql`UPDATE tapcard_cards SET org_id = ${org.id} WHERE id = ${cardId}`;
  await sql`INSERT INTO tapcard_listed_cards (card_id, ticker) VALUES (${cardId}, 'DEMO')`;
  return { orgId: org.id, cardId };
}
async function count(table: "tapcard_followers" | "tapcard_follower_details" | "tapcard_follow_log", cardId: string) {
  // A table that was never created holds nothing (the schema appears the first time something is written).
  try { return await countRows(table, cardId); } catch { return 0; }
}
async function countRows(table: string, cardId: string) {
  const rows = table === "tapcard_followers" ? await sql`SELECT COUNT(*)::int AS n FROM tapcard_followers WHERE card_id = ${cardId}`
    : table === "tapcard_follower_details" ? await sql`SELECT COUNT(*)::int AS n FROM tapcard_follower_details WHERE card_id = ${cardId}`
    : await sql`SELECT COUNT(*)::int AS n FROM tapcard_follow_log WHERE card_id = ${cardId}`;
  return Number((rows as { n: number }[])[0].n);
}

test("demo names: only Example Resources plc or a '(demo)' copy", async () => {
  const { isDemoName } = await import("../lib/tapcardDemoSim");
  assert.equal(isDemoName("Example Resources plc"), true);
  assert.equal(isDemoName("Acme Mining plc (demo)"), true);
  assert.equal(isDemoName("Acme Mining plc"), false);
  assert.equal(isDemoName("Real Company demo"), false);
});

test("the simulation refuses a company that is not on the demo list, or has a real name", async () => {
  const { simArrive, simResults, simClear } = await import("../lib/tapcardDemoSim");
  const { createEvent } = await import("../lib/tapcardEvents");
  const real = await newListedCompany("Real Client plc", "realtok-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const ev = await createEvent(real.orgId, "AGM", undefined, undefined);
  assert.ok(ev.ok);
  const code = ev.ok ? ev.code : "";
  assert.equal((await simArrive(real.orgId, code, 5, 1)).ok, false, "not on the list");
  await sql`INSERT INTO tapcard_demo_orgs (org_id) VALUES (${real.orgId})`;
  assert.equal((await simArrive(real.orgId, code, 5, 1)).ok, false, "on the list but a real name");
  assert.equal((await simResults(real.orgId, 3, 3, 1)).ok, false);
  assert.equal((await simClear(real.orgId)).ok, false);
  assert.equal(await count("tapcard_followers", real.cardId), 0, "nothing was added");
});

test("arrive adds followers with attendance, results adds taps and followers, clear removes them and resets the counters", async () => {
  const { simArrive, simResults, simClear } = await import("../lib/tapcardDemoSim");
  const { createEvent } = await import("../lib/tapcardEvents");
  const { setAnnouncement } = await import("../lib/tapcardOffers");
  const demo = await newListedCompany("Example Resources plc", "demotok-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  await sql`INSERT INTO tapcard_demo_orgs (org_id) VALUES (${demo.orgId})`;
  const ev = await createEvent(demo.orgId, "Demo roadshow", undefined, undefined);
  assert.ok(ev.ok);
  const code = ev.ok ? ev.code : "";

  assert.equal((await simArrive(demo.orgId, "not-an-event", 3, 1)).ok, false, "only this company's events");
  const a = await simArrive(demo.orgId, code, 10, 1);
  assert.ok(a.ok && a.added === 10);
  assert.equal(await count("tapcard_followers", demo.cardId), 10);
  const att = Number(((await sql`SELECT COUNT(*)::int AS n FROM tapcard_event_attendance WHERE card_id = ${demo.cardId} AND event_code = ${code}`) as { n: number }[])[0].n);
  assert.equal(att, 10, "every arrival is recorded against the event");
  const shared = await count("tapcard_follower_details", demo.cardId);
  assert.ok(shared >= 5 && shared < 10, "about 60% share their details");

  const noHeadline = await simResults(demo.orgId, 3, 0, 101);
  assert.equal(noHeadline.ok, false, "taps need a headline first");
  const posted = await setAnnouncement(demo.cardId, "Example Resources plc (demo): trading update", "https://tapcard.aiert.co.uk/investors");
  assert.ok(posted.ok);
  const r = await simResults(demo.orgId, 6, 4, 101);
  assert.ok(r.ok && r.taps === 6 && r.followers === 4);
  assert.equal(await count("tapcard_followers", demo.cardId), 14);
  const opens = Number(((await sql`SELECT COALESCE(SUM(n),0)::int AS n FROM tapcard_announcement_opens o JOIN tapcard_announcements a ON a.id = o.announcement_id WHERE a.card_id = ${demo.cardId}`) as { n: number }[])[0].n);
  assert.equal(opens, 6);

  const c = await simClear(demo.orgId);
  assert.ok(c.ok && c.removed === 14);
  assert.equal(await count("tapcard_followers", demo.cardId), 0);
  assert.equal(await count("tapcard_follower_details", demo.cardId), 0);
  assert.equal(await count("tapcard_follow_log", demo.cardId), 0, "the join/leave history starts flat again");
  const left = Number(((await sql`SELECT COUNT(*)::int AS n FROM tapcard_event_attendance WHERE card_id = ${demo.cardId}`) as { n: number }[])[0].n);
  assert.equal(left, 0);
  const opens2 = Number(((await sql`SELECT COALESCE(SUM(n),0)::int AS n FROM tapcard_announcement_opens o JOIN tapcard_announcements a ON a.id = o.announcement_id WHERE a.card_id = ${demo.cardId}`) as { n: number }[])[0].n);
  assert.equal(opens2, 0);
});

test("the demo event is made once, and the demo headline is saved as the latest announcement; real companies are refused", async () => {
  const { simEvent, simHeadline } = await import("../lib/tapcardDemoSim");
  const { publicAnnouncement } = await import("../lib/tapcardOffers");
  const real = await newListedCompany("Another Client plc", "realtok-cccccccccccccccccccccccccccccccccccccccc");
  assert.equal((await simEvent(real.orgId, "Roadshow", undefined, undefined)).ok, false);
  assert.equal((await simHeadline(real.orgId, "Hello", "https://tapcard.aiert.co.uk/investors")).ok, false);

  const demo = await newListedCompany("Acme Mining plc (demo)", "demotok-dddddddddddddddddddddddddddddddddddddddd");
  await sql`INSERT INTO tapcard_demo_orgs (org_id) VALUES (${demo.orgId})`;
  const a = await simEvent(demo.orgId, "Roadshow", "2026-11-18T00:00:00.000Z", "2026-11-18T23:59:00.000Z");
  assert.ok(a.ok && a.created);
  const b = await simEvent(demo.orgId, " roadshow ", "2026-11-18T00:00:00.000Z", "2026-11-18T23:59:00.000Z");
  assert.ok(b.ok && !b.created && a.ok && b.code === a.code, "a second press finds the same event");

  const h = await simHeadline(demo.orgId, "Acme (demo): Fundraise announced.", "https://tapcard.aiert.co.uk/investors");
  assert.ok(h.ok);
  const latest = await publicAnnouncement(demo.cardId);
  assert.equal(latest?.text, "Acme (demo): Fundraise announced.");
});
