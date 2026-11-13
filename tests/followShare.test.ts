import test from "node:test";
import assert from "node:assert/strict";
import { validateShare } from "../lib/tapcardShareRules";

test("good details are tidied and accepted", () => {
  const r = validateShare({ name: "  Pat   Smith ", email: " Pat@Example.COM ", phone: "" });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.details, { name: "Pat Smith", email: "pat@example.com", phone: "" });
});
test("a phone number is never taken, even if an older app sends one", () => {
  const r = validateShare({ name: "Pat Smith", email: "p@x.com", phone: "+44 7700 900123" });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.details.phone, "");
  assert.ok(validateShare({ name: "Pat Smith", email: "p@x.com", phone: "12" }).ok, "a bad phone number no longer blocks the follow");
});
test("missing or bad name and email are refused", () => {
  assert.equal(validateShare(null).ok, false);
  assert.equal(validateShare({ name: "P", email: "p@x.com" }).ok, false);
  assert.equal(validateShare({ name: "Pat Smith", email: "not-an-email" }).ok, false);
  assert.equal(validateShare({ name: "Pat Smith", email: "p@x" }).ok, false);
  assert.equal(validateShare({ name: "x".repeat(130), email: "p@x.com" }).ok, false);
});
