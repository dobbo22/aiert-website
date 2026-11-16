import test from "node:test";
import assert from "node:assert/strict";
import { trimSeries } from "../lib/tapcardInsightsSeries";

const pt = (i: number, total: number) => ({ day: `d${i}`, total, joined: 0, left: 0, viaEvents: 0 });
const days = (n: number, firstActive: number) => Array.from({ length: n }, (_, i) => pt(i, i >= firstActive ? 4 : 0));

test("by default the chart starts at the first day with followers, with at least 14 days", () => {
  assert.equal(trimSeries(days(90, 85), "since").length, 14);
  assert.equal(trimSeries(days(90, 40), "since").length, 50);
  assert.equal(trimSeries(days(90, 0), "since").length, 90);
  assert.equal(trimSeries(days(90, 90), "since").length, 14);
});
test("30 and 90 day ranges", () => {
  assert.equal(trimSeries(days(90, 10), "30").length, 30);
  assert.equal(trimSeries(days(90, 10), "90").length, 90);
});

import { followChangeAfter, investorMix, per100 } from "../lib/tapcardInsightsMath";
test("follow change around an announcement: the posting day and the next, nothing before counting began", () => {
  const s = [{ day: "2026-11-10", joined: 1, left: 0, total: 1, viaEvents: 0 }, { day: "2026-11-11", joined: 2, left: 1, total: 2, viaEvents: 0 }, { day: "2026-11-12", joined: 3, left: 0, total: 5, viaEvents: 0 }];
  assert.deepEqual(followChangeAfter(s, "2026-11-11", "2026-11-01"), { joined: 5, left: 1 });
  assert.deepEqual(followChangeAfter(s, "2026-11-12", "2026-11-01"), { joined: 3, left: 0 });
  assert.equal(followChangeAfter(s, "2026-11-11", "2026-11-12"), null);
  assert.equal(followChangeAfter(s, "2026-10-01", "2026-09-01"), null);
});
test("investor mix: companies, private, biggest organisations, new organisations", () => {
  const now = new Date("2026-11-16T12:00:00Z").getTime();
  const m = investorMix([
    { domain: "hobart.example", consentedAt: "2026-11-10T00:00:00Z" }, { domain: "hobart.example", consentedAt: "2026-08-01T00:00:00Z" },
    { domain: "morgan.example", consentedAt: "2026-11-12T00:00:00Z" }, { domain: null, consentedAt: "2026-11-01T00:00:00Z" },
  ], now);
  assert.deepEqual([m.people, m.companies, m.private, m.newOrgs30], [4, 2, 1, 1]);
  assert.deepEqual(m.top[0], { domain: "hobart.example", people: 2 });
  assert.equal(per100(1, 4), 25);
  assert.equal(per100(1, 0), null);
});
