import test from "node:test";
import assert from "node:assert/strict";
import { dueStep } from "../lib/tapcardFreeReminder";

test("nothing is due until 30 days are left", () => {
  assert.equal(dueStep(45, []), null);
  assert.equal(dueStep(30.5, []), null);
});
test("30, 14 and 7 day reminders each go once", () => {
  assert.equal(dueStep(29, []), 30);
  assert.equal(dueStep(29, [30]), null);
  assert.equal(dueStep(13, [30]), 14);
  assert.equal(dueStep(6, [30, 14]), 7);
  assert.equal(dueStep(6, [30, 14, 7]), null);
});
test("a company set up late gets only the nearest reminder, and none once the date has passed", () => {
  assert.equal(dueStep(5, []), 7);
  assert.equal(dueStep(-1, []), null);
});
