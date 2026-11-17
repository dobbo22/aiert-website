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

test("the roadshow has one slot per meeting (made once), and each meeting records a random crowd in its own slot with fund managers sharing", async () => {
  const { simRoadshow, simMeeting } = await import("../lib/tapcardDemoSim");
  const { FIRMS, MEETING_TIMES, ATTENDEES } = await import("../lib/demoScenario");
  const demo = await newListedCompany("Roadshow Co (demo)", "demotok-eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
  await sql`INSERT INTO tapcard_demo_orgs (org_id) VALUES (${demo.orgId})`;
  const days = ["2026-11-18", "2026-11-19"];
  const slots = Array.from({ length: 10 }, (_, k) => {
    const [from, to] = MEETING_TIMES[k % 5], d = days[k < 5 ? 0 : 1];
    return { label: `Meeting ${k + 1}: ${FIRMS[k].name}`, startsAt: `${d}T${from}:00.000Z`, endsAt: `${d}T${to}:00.000Z` };
  });
  const a = await simRoadshow(demo.orgId, "IPO roadshow", "2026-11-18T00:00:00.000Z", "2026-11-19T23:59:00.000Z", slots);
  assert.ok(a.ok && a.slots === 10);
  const b = await simRoadshow(demo.orgId, "IPO roadshow", "2026-11-18T00:00:00.000Z", "2026-11-19T23:59:00.000Z", slots);
  assert.ok(b.ok && a.ok && b.code === a.code);
  const n = Number(((await sql`SELECT COUNT(*)::int AS n FROM tapcard_listed_event_slots WHERE event_code = ${a.ok ? a.code : ""}`) as { n: number }[])[0].n);
  assert.equal(n, 10, "a second press adds no duplicate slots");

  const code = a.ok ? a.code : "";
  const m = await simMeeting(demo.orgId, code, 2, "2026-11-18T12:30:00.000Z"); // the third meeting of day 1
  assert.ok(m.ok);
  if (m.ok) {
    assert.equal(m.firm, FIRMS[2].name);
    assert.ok(m.attendees >= ATTENDEES[0] && m.attendees <= ATTENDEES[1]);
    assert.ok(m.shared >= 1 && m.shared <= 3);
    const inSlot = Number(((await sql`SELECT COUNT(*)::int AS n FROM tapcard_event_attendance a JOIN tapcard_listed_event_slots s ON s.id = a.slot_id WHERE a.card_id = ${demo.cardId} AND s.label LIKE '%Pemberton%'`) as { n: number }[])[0].n);
    assert.equal(inSlot, m.attendees, "everyone is recorded against that firm's slot");
    const mails = (await sql`SELECT email FROM tapcard_follower_details WHERE card_id = ${demo.cardId}`) as { email: string }[];
    assert.equal(mails.length, m.shared);
    assert.ok(mails.every((r) => r.email.endsWith("@pemberton-hale.example")), "fund managers use their firm's made-up address");
  }
  assert.equal((await simMeeting(demo.orgId, code, 99, "2026-11-18T12:30:00.000Z")).ok, false, "unknown firm");
  assert.equal((await simMeeting(demo.orgId, "nope", 1, "2026-11-18T12:30:00.000Z")).ok, false, "unknown event");
});

test("Clear removes the made-up people, the demo's headlines and the roadshow, and keeps the people who really follow", async () => {
  const { simRoadshow, simMeeting, simHeadline, simResults, simClear } = await import("../lib/tapcardDemoSim");
  const { setFollower, publicAnnouncement } = await import("../lib/tapcardOffers");
  const { ROADSHOW_LABEL } = await import("../lib/demoScenario");
  const demo = await newListedCompany("Keep Real (demo)", "demotok-ffffffffffffffffffffffffffffffffffffffff");
  await sql`INSERT INTO tapcard_demo_orgs (org_id) VALUES (${demo.orgId})`;

  // Two people who really scanned the follow QR on their phones (not made by the simulation).
  await setFollower(demo.cardId, "real-phone-martin-0000000000", true);
  await setFollower(demo.cardId, "real-phone-jasper-0000000000", true);

  const rs = await simRoadshow(demo.orgId, ROADSHOW_LABEL, "2026-11-18T00:00:00.000Z", "2026-11-19T23:59:00.000Z", [{ label: "Day 1 09:00: Northgate", startsAt: "2026-11-18T09:00:00.000Z", endsAt: "2026-11-18T10:00:00.000Z" }]);
  assert.ok(rs.ok);
  assert.ok((await simMeeting(demo.orgId, rs.ok ? rs.code : "", 0, "2026-11-18T09:30:00.000Z")).ok);
  assert.ok((await simHeadline(demo.orgId, "Keep Real (demo): Fundraise announced.", "https://tapcard.aiert.co.uk/investors")).ok);
  assert.ok((await simResults(demo.orgId, 5, 3, 101)).ok);
  assert.ok((await count("tapcard_followers", demo.cardId)) > 2, "the simulation added people");

  const c = await simClear(demo.orgId);
  assert.ok(c.ok);
  assert.equal(await count("tapcard_followers", demo.cardId), 2, "only the two real followers remain");
  assert.equal(await publicAnnouncement(demo.cardId), null, "the demo's headline is gone");
  const ev = Number(((await sql`SELECT COUNT(*)::int AS n FROM tapcard_listed_events WHERE org_id = ${demo.orgId}`) as { n: number }[])[0].n);
  assert.equal(ev, 0, "the roadshow is removed so the next run builds it again");
  const log = (await sql`SELECT joined, "left" FROM tapcard_follow_log WHERE card_id = ${demo.cardId}`) as { joined: number; left: number }[];
  assert.equal(log.length, 1);
  assert.equal(Number(log[0].joined), 2, "the history starts again with the two real followers");
  assert.equal(Number(log[0].left), 0);
});

test("the Followers tab names each demo firm properly, and files made-up retail investors as private", async () => {
  const { FIRMS } = await import("../lib/demoScenario");
  const { companyNameFromDomain, emailGroup } = await import("../lib/tapcardShareRules");
  const { demoPerson } = await import("../lib/tapcardDemoSim");
  const letters = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");
  for (const f of FIRMS) {
    const g = emailGroup(`someone@${f.domain}`);
    assert.equal(g.kind, "company");
    assert.equal(letters(companyNameFromDomain(f.domain)), letters(f.name), `${f.domain} reads as ${f.name}`);
  }
  assert.equal(new Set(FIRMS.map((f) => f.domain)).size, FIRMS.length, "each firm has its own domain");
  for (let n = 1; n <= 8; n++) assert.equal(emailGroup(demoPerson(n).email).kind, "private", "retail demo people are private investors");
});
