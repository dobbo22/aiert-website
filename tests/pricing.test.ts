import { test } from "node:test";
import assert from "node:assert/strict";
import { LOCATION_TIERS, MAX_LOCATIONS, MIN_LOCATIONS, STAFF_PER_LOCATION, annualGBP, cardAllowance, perLocationGBP } from "../lib/tapcardBizPricing";

// TapCard for Business prices. These must match the live Stripe price (volume tiers: to 4 = £42, to 19 = £34, then £27) and the public pages.

test("price per location follows the volume tier", () => {
  assert.equal(perLocationGBP(2), 42);
  assert.equal(perLocationGBP(4), 42);
  assert.equal(perLocationGBP(5), 34);
  assert.equal(perLocationGBP(19), 34);
  assert.equal(perLocationGBP(20), 27);
  assert.equal(perLocationGBP(100), 27);
});

test("yearly totals (the same numbers Stripe charges)", () => {
  const expected: Record<number, number> = { 2: 84, 3: 126, 4: 168, 5: 170, 19: 646, 20: 540, 100: 2700 };
  for (const [n, total] of Object.entries(expected)) assert.equal(annualGBP(Number(n)), total, `${n} locations`);
});

test("limits and allowances", () => {
  assert.equal(MIN_LOCATIONS, 2);
  assert.equal(MAX_LOCATIONS, 100);
  assert.equal(cardAllowance(2), 2 * (1 + STAFF_PER_LOCATION));
  assert.equal(cardAllowance(10), 110);
});

test("the tiers cover every allowed number of locations with no gaps", () => {
  for (let n = MIN_LOCATIONS; n <= MAX_LOCATIONS; n++) {
    assert.equal(LOCATION_TIERS.filter((t) => n >= t.from && n <= t.to).length, 1, `${n} locations`);
  }
});
