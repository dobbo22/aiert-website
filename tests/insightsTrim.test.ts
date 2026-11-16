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
