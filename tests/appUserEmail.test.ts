import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmail, topFixes } from "../lib/appUserEmail";

const base = { firstName: "Sam", business: "Bean & Brew <Ltd>", personal: false, missing: ["photo", "website", "links", "linkedin", "address", "title"] as never[], sentTo: 0, imageBase: "https://x.test/img", guideUrl: "https://x.test/guide", replyTo: "martin@aiert.co.uk" };

test("the three most useful gaps are chosen, in order", () => {
  assert.deepEqual(topFixes(["title", "linkedin", "website", "photo"] as never[], false), ["website", "photo", "linkedin"]);
  assert.deepEqual(topFixes(["links", "title"] as never[], true), ["title"], "personal cards are not told to add booking links");
  assert.deepEqual(topFixes([], false), []);
});

test("the email is personalised, escapes names, and follows the wording rule", () => {
  const e = buildEmail(base);
  assert.match(e.subject, /^Sam, 3 quick things to finish your TapCard$/);
  assert.match(e.html, /Bean &amp; Brew &lt;Ltd&gt;/);
  assert.doesNotMatch(e.html, /<Ltd>/);
  assert.match(e.html, /Add your website/);
  assert.doesNotMatch(e.html + e.text, /free app|free TapCard app|no app needed/i);
  assert.match(e.text, /three cards on one phone/);
  assert.match(e.html, /https:\/\/x\.test\/img\/qr-branded\.jpg/);
});

test("wording changes with how much the card has been shared", () => {
  assert.match(buildEmail(base).text, /hasn't been sent to anyone yet/);
  assert.match(buildEmail({ ...base, sentTo: 2 }).text, /already sent your card to 2 people/);
  assert.match(buildEmail({ ...base, sentTo: 1 }).text, /sent your card to someone/);
  assert.match(buildEmail({ ...base, missing: ["social"] as never[] }).text, /One small thing would make it work/);
  assert.match(buildEmail(base).text, /Three small things would make it work/);
  const done = buildEmail({ ...base, missing: [] });
  assert.match(done.subject, /nearly there/);
  assert.equal(buildEmail({ ...base, firstName: "" }).text.startsWith("Hi,"), true);
});
