import { test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

const PERSON = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const SCANNER = "Mozilla/5.0 (compatible; MimecastLinkChecker/1.0; +http://www.mimecast.com)";

test("IR outreach: a personal link records what a person did, ignores scanners, unknown codes and junk", async () => {
  const { addIrRecipient, recordIrVisit, irSummary, markIrSent, deleteIrRecipient, irLink } = await import("../lib/tapcardIrOutreach");
  const a = await addIrRecipient("Tim Example", "Example Advisory");
  const b = await addIrRecipient("Jo Sample", "Sample Capital");
  assert.match(a.token, /^[a-z0-9]{8,16}$/);
  assert.equal(a.link, irLink(a.token));
  assert.notEqual(a.token, b.token);

  // Nothing yet.
  let rows = await irSummary();
  assert.equal(rows.find((r) => r.token === a.token)?.opens, 0);

  assert.equal(await recordIrVisit(a.token, "visit", "", PERSON), true);
  assert.equal(await recordIrVisit(a.token, "visit", "", SCANNER), true, "a scanner's hit is stored, but flagged");
  assert.equal(await recordIrVisit(a.token, "tab", "admin", PERSON), true);
  assert.equal(await recordIrVisit(a.token, "video", "play", PERSON), true);
  assert.equal(await recordIrVisit("zzzzzzzzzz", "visit", "", PERSON), false, "unknown code");
  assert.equal(await recordIrVisit("../etc", "visit", "", PERSON), false, "badly formed code");
  assert.equal(await recordIrVisit(a.token, "delete-everything", "", PERSON), false, "unknown kind");

  rows = await irSummary();
  const ra = rows.find((r) => r.token === a.token)!;
  const rb = rows.find((r) => r.token === b.token)!;
  assert.equal(ra.opens, 1, "the scanner is not counted as an open");
  assert.equal(ra.robotHits, 1);
  assert.equal(ra.engaged, true);
  assert.deepEqual(ra.tabs, ["admin"]);
  assert.equal(ra.video, "played");
  assert.ok(ra.firstAt && ra.lastAt);
  assert.equal(rb.opens, 0);
  assert.equal(rb.engaged, false);

  // A scanner alone never looks like someone reading.
  assert.equal(await recordIrVisit(b.token, "visit", "", SCANNER), true);
  assert.equal(await recordIrVisit(b.token, "engaged", "", SCANNER), true);
  const rb2 = (await irSummary()).find((r) => r.token === b.token)!;
  assert.equal(rb2.opens, 0);
  assert.equal(rb2.engaged, false);
  assert.equal(rb2.firstAt, null);
  assert.equal(rb2.robotHits, 2);

  await recordIrVisit(a.token, "video-end", "", PERSON);
  assert.equal((await irSummary()).find((r) => r.token === a.token)!.video, "finished");

  await markIrSent(a.token, new Date("2026-11-18T09:00:00Z"));
  assert.equal((await irSummary()).find((r) => r.token === a.token)!.sentAt, "2026-11-18T09:00:00.000Z");

  await deleteIrRecipient(a.token);
  assert.equal((await irSummary()).some((r) => r.token === a.token), false);
  assert.equal(await recordIrVisit(a.token, "visit", "", PERSON), false, "a deleted link records nothing");
});

test("IR outreach: one link cannot fill the table", async () => {
  const { addIrRecipient, recordIrVisit } = await import("../lib/tapcardIrOutreach");
  const c = await addIrRecipient("Loop Test", "Test");
  let stored = 0;
  for (let i = 0; i < 320; i++) if (await recordIrVisit(c.token, "tab", "see", PERSON)) stored++;
  assert.equal(stored, 300);
});

test("IR outreach: the admin list shows who looked, who only opened, and who has not", async () => {
  const { addIrRecipient, recordIrVisit, markIrSent } = await import("../lib/tapcardIrOutreach");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const Page = (await import("../app/admin/social/ir-outreach/page")).default;
  const looked = await addIrRecipient("Lena Looked", "Looked Ltd");
  const opened = await addIrRecipient("Otis Opened", "Opened Ltd");
  const quiet = await addIrRecipient("Quinn Quiet", "Quiet Ltd");
  for (const p of [looked, opened, quiet]) await markIrSent(p.token);
  await recordIrVisit(looked.token, "visit", "", PERSON); await recordIrVisit(looked.token, "engaged", "", PERSON); await recordIrVisit(looked.token, "tab", "admin", PERSON);
  await recordIrVisit(opened.token, "visit", "", PERSON);
  const html = renderToStaticMarkup(await Page());
  const row = (name: string) => html.slice(html.indexOf(name), html.indexOf("</tr>", html.indexOf(name)));
  assert.match(row("Lena Looked"), /Looked at it/);
  assert.match(row("Lena Looked"), /Your admin/);
  assert.match(row("Otis Opened"), /Opened the link/);
  assert.match(row("Quinn Quiet"), /Not opened yet/);
});

test("IR outreach: who they are and their address are kept, and the page offers the right email for them", async () => {
  const { addIrRecipient, irSummary } = await import("../lib/tapcardIrOutreach");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const Page = (await import("../app/admin/social/ir-outreach/page")).default;
  const b = await addIrRecipient("Bea Broker", "Brokerage Ltd", "met at a roadshow", "bea@brokerage.example", "broker");
  const bad = await addIrRecipient("Odd Entry", "Odd Ltd", "", "not an email", "not-a-kind");
  const rows = await irSummary();
  const rb = rows.find((r) => r.token === b.token)!;
  assert.equal(rb.email, "bea@brokerage.example");
  assert.equal(rb.kind, "broker");
  assert.equal(rb.note, "met at a roadshow");
  const rbad = rows.find((r) => r.token === bad.token)!;
  assert.equal(rbad.email, "", "a bad address is dropped");
  assert.equal(rbad.kind, "contact", "an unknown type becomes 'someone I know'");
  const html = renderToStaticMarkup(await Page());
  // Each person has two rows: their details, then the email panel under them.
  const start = html.indexOf("Bea Broker");
  const row = html.slice(start, html.indexOf("</tr>", html.indexOf("</tr>", start) + 5));
  assert.match(row, /Broker \/ corporate finance/);
  assert.match(row, /bea@brokerage\.example/);
  assert.match(row, /Write email/);
  assert.match(row, /roadshows, events and notifications/, "the broker subject is used");
  assert.ok(row.includes(b.token), "the email carries this person's own link");
});

test("IR outreach timeline: typed events and page visits read together, oldest first", async () => {
  const { addIrRecipient, addIrEvent, deleteIrEvent, recordIrVisit, irSummary, deleteIrRecipient } = await import("../lib/tapcardIrOutreach");
  const PERSON2 = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const p = await addIrRecipient("Kim Example", "Example Broker");
  assert.equal(await addIrEvent(p.token, "email-sent", "Intro email", "With the investors link", new Date("2026-11-18T09:00:00Z")), true);
  assert.equal(await addIrEvent(p.token, "email-received", "Reply: happy to talk", "", new Date("2026-11-18T10:00:00Z")), true);
  assert.equal(await addIrEvent(p.token, "carrier-pigeon", "Nope"), false, "unknown type");
  assert.equal(await addIrEvent(p.token, "note", "x"), false, "title too short");
  assert.equal(await addIrEvent("zzzzzzzzzz", "note", "Unknown person"), false, "unknown code");
  assert.equal(await addIrEvent(p.token, "note", "Bad date", "", new Date("nonsense")), false, "bad date");
  await recordIrVisit(p.token, "visit", "", PERSON2);
  await recordIrVisit(p.token, "visit", "", PERSON2); // a repeat within a minute folds into one line
  await recordIrVisit(p.token, "visit", "", "Mozilla/5.0 (compatible; MimecastLinkChecker/1.0)");
  const row = (await irSummary()).find((r) => r.token === p.token)!;
  const kinds = row.timeline.map((t) => t.kind);
  assert.deepEqual(kinds.filter((k) => k !== "page"), ["email-sent", "email-received"]);
  assert.equal(kinds.filter((k) => k === "page").length, 1, "one page line, repeats and robots left out");
  assert.deepEqual(row.timeline.map((t) => t.at), [...row.timeline.map((t) => t.at)].sort());
  const id = row.timeline.find((t) => t.kind === "email-sent")!.id!;
  await deleteIrEvent(p.token, id);
  assert.equal((await irSummary()).find((r) => r.token === p.token)!.timeline.some((t) => t.id === id), false);
  await deleteIrRecipient(p.token);
});
