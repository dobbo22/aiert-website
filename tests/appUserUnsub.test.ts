import test from "node:test";
import assert from "node:assert/strict";
import { unsubToken, emailFromUnsubToken } from "../lib/appUserUnsubToken";
import { buildEmail } from "../lib/appUserEmail";

// The secret is only read when a token is made, so setting it here is early enough.
process.env.ADMIN_PASSWORD ??= "test-secret-for-unsub";

test("a token returns the address it was made for, lower-cased", () => {
  assert.equal(emailFromUnsubToken(unsubToken(" Pete@Example.com ")), "pete@example.com");
});
test("a tampered or foreign token is refused", () => {
  const t = unsubToken("a@b.com");
  const [body, sig] = t.split(".");
  const other = Buffer.from("victim@b.com").toString("base64url");
  assert.equal(emailFromUnsubToken(`${other}.${sig}`), null);
  assert.equal(emailFromUnsubToken(`${body}.${sig.slice(0, -1)}x`), null);
  assert.equal(emailFromUnsubToken(body), null);
  assert.equal(emailFromUnsubToken(`${body}.${sig}.extra`), null);
  assert.equal(emailFromUnsubToken(""), null);
});
test("the email carries the unsubscribe link when given one, and still builds without", () => {
  const base = { firstName: "", business: "X", personal: true, missing: [] as never[], sentTo: 0, imageBase: "https://i", guideUrl: "https://g", replyTo: "m@x.com" };
  const withLink = buildEmail({ ...base, unsubscribeUrl: "https://u/au/abc" });
  assert.ok(withLink.html.includes("https://u/au/abc") && withLink.text.includes("https://u/au/abc"));
  const without = buildEmail({ ...base });
  assert.ok(!without.html.includes("unsubscribe here"));
});
