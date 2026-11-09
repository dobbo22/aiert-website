import { before, test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

// Loaded after the database stub is installed (lib/db would otherwise demand a real DATABASE_URL).
let q: typeof import("../lib/socialQueue");
let li: typeof import("../lib/linkedinApi");
before(async () => {
  q = await import("../lib/socialQueue");
  li = await import("../lib/linkedinApi");
});

test("UK times convert to UTC across the clock change", () => {
  assert.equal(q.londonToUtc("2026-11-10T09:00").toISOString(), "2026-11-10T09:00:00.000Z", "GMT in winter");
  assert.equal(q.londonToUtc("2026-07-10T09:00").toISOString(), "2026-07-10T08:00:00.000Z", "BST in summer");
  assert.equal(q.londonToUtc("2026-03-29T12:00").toISOString(), "2026-03-29T11:00:00.000Z", "BST starts 29 March 2026");
  assert.equal(q.londonToUtc("2026-10-25T12:00").toISOString(), "2026-10-25T12:00:00.000Z", "GMT again from 25 October 2026");
  assert.throws(() => q.londonToUtc("tomorrow"));
});

test("polls follow LinkedIn's limits", () => {
  assert.equal(li.validatePoll({ question: "Which would you use?", options: ["Offers", "Stamp cards"], duration: "THREE_DAYS" }), null);
  assert.match(li.validatePoll({ question: "x".repeat(141), options: ["a", "b"], duration: "ONE_DAY" })!, /140/);
  assert.match(li.validatePoll({ question: "q", options: ["only one"], duration: "ONE_DAY" })!, /2 and 4/);
  assert.match(li.validatePoll({ question: "q", options: ["a", "b", "c", "d", "e"], duration: "ONE_DAY" })!, /2 and 4/);
  assert.match(li.validatePoll({ question: "q", options: ["a", "x".repeat(31)], duration: "ONE_DAY" })!, /30/);
});

test("scheduled items are checked before they are queued", () => {
  const base = { runAt: new Date(), targets: ["linkedin_page" as const], kind: "post" as const, body: "Hello" };
  assert.equal(q.validateItem(base), null);
  assert.match(q.validateItem({ ...base, body: " " })!, /text/i);
  assert.match(q.validateItem({ ...base, targets: [] })!, /place/i);
  assert.match(q.validateItem({ ...base, kind: "document", targets: ["facebook"], mediaUrl: "x" })!, /only go to LinkedIn/);
  assert.match(q.validateItem({ ...base, kind: "document" })!, /PDF/);
});

test("post text is escaped so LinkedIn does not cut it off", () => {
  assert.equal(li.escapeCommentary("Offer (today) #cafe"), "Offer \\(today\\) #cafe");
});

test("the queue stores items, lists the next pending first, and cancels only pending ones", async () => {
  const later = await q.enqueue({ runAt: new Date(Date.now() + 2 * 86_400_000), targets: ["linkedin_page", "facebook"], kind: "post", body: "Later post" });
  const sooner = await q.enqueue({ runAt: new Date(Date.now() + 3_600_000), targets: ["linkedin_person"], kind: "poll", body: "Poll", poll: { question: "Which?", options: ["A", "B"], duration: "THREE_DAYS" } });
  const rows = await q.listQueue();
  const pending = rows.filter((r) => r.status === "pending");
  assert.deepEqual(pending.map((r) => r.id), [sooner, later], "soonest first");
  assert.deepEqual(rows.find((r) => r.id === later)!.targets, ["linkedin_page", "facebook"]);
  assert.equal(rows.find((r) => r.id === sooner)!.poll!.question, "Which?");
  await q.cancelItem(sooner);
  assert.equal((await q.listQueue()).find((r) => r.id === sooner)!.status, "cancelled");
  await assert.rejects(() => q.enqueue({ runAt: new Date(), targets: [], kind: "post", body: "x" }), /place/i);
});

test("due items are claimed once, and a failed publish is recorded without being retried", async () => {
  delete process.env.LINKEDIN_ACCESS_TOKEN; // no credentials: publishing fails safely and nothing is ever sent
  delete process.env.LINKEDIN_ORG_URN;
  const due = await q.enqueue({ runAt: new Date(Date.now() - 60_000), targets: ["linkedin_page"], kind: "post", body: "Due now" });
  const notDue = await q.enqueue({ runAt: new Date(Date.now() + 86_400_000), targets: ["linkedin_page"], kind: "post", body: "Tomorrow" });
  const first = await q.runDue();
  assert.equal(first.processed >= 1, true);
  const rows = await q.listQueue();
  const d = rows.find((r) => r.id === due)!;
  assert.equal(d.status, "failed");
  assert.match(d.results!.linkedin_page.error!, /LINKEDIN/);
  assert.equal(rows.find((r) => r.id === notDue)!.status, "pending", "future items are left alone");
  assert.equal((await q.runDue()).processed, 0, "already handled items are not picked up again");
});
