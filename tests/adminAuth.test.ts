import { test } from "node:test";
import assert from "node:assert/strict";
process.env.ADMIN_PASSWORD = "correct horse battery staple";
import { adminSessionToken, isValidAdminSession, passwordMatches } from "../lib/mailbroomAdminAuth";

test("the admin login cookie expires and cannot be forged", () => {
  const now = Date.now();
  const token = adminSessionToken(now);
  assert.equal(isValidAdminSession(token, now + 1000), true);
  assert.equal(isValidAdminSession(token, now + 29 * 86_400_000), true);
  assert.equal(isValidAdminSession(token, now + 31 * 86_400_000), false, "expired after 30 days");
  const [exp, sig] = token.split(".");
  assert.equal(isValidAdminSession(`${Number(exp) + 999999999}.${sig}`, now), false, "a later expiry with the old signature");
  assert.equal(isValidAdminSession(`${exp}.${sig.slice(0, -2)}00`, now), false, "a changed signature");
  assert.equal(isValidAdminSession("garbage", now), false);
  assert.equal(isValidAdminSession(undefined, now), false);
  assert.equal(isValidAdminSession("", now), false);
  // the old fixed-value cookie no longer works
  assert.equal(isValidAdminSession("a".repeat(64), now), false);
  // a different password gives different cookies
  const other = adminSessionToken(now);
  process.env.ADMIN_PASSWORD = "another password";
  assert.equal(isValidAdminSession(other, now), false, "changing the password signs everyone out");
  process.env.ADMIN_PASSWORD = "correct horse battery staple";
});

test("the admin password check", () => {
  assert.equal(passwordMatches("correct horse battery staple"), true);
  assert.equal(passwordMatches("correct horse battery stapl"), false);
  assert.equal(passwordMatches(""), false);
  assert.equal(passwordMatches(undefined), false);
  assert.equal(passwordMatches({ toString: () => "correct horse battery staple" }), false);
});
