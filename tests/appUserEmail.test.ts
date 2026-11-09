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

test("first names are only taken when the card clearly holds a person's name", async () => {
  const { installStubs } = await import("./helpers/pgdb");
  installStubs();
  const { firstNameOf, missingOf } = await import("../lib/appUserCampaign");
  assert.equal(firstNameOf("Andy Smith", "Focused Financial Advice"), "Andy");
  assert.equal(firstNameOf("Administrative Team", "Krontroine Limited"), "", "not a person");
  assert.equal(firstNameOf("MICHAEL JONES", "Belfius"), "Michael", "capitals are tidied");
  assert.equal(firstNameOf("ATP Creative", "ATP"), "", "an acronym is not a name");
  assert.equal(firstNameOf("Hard Rock Hotel", "Hard Rock Hotel"), "", "the company itself");
  assert.equal(firstNameOf("Cher", ""), "", "a single word is not enough to be sure");
  const blank = { id: "x", title: "", phone: "", website: "", photo_url: null, linkedin_url: "", twitter_url: "", instagram_url: "", facebook_url: "", tiktok_url: "", whatsapp_url: "", address: "", links: "[]" };
  assert.ok(missingOf(blank, true).includes("photo"));
  assert.ok(!missingOf({ ...blank, website: "https://x.co.uk" }, false).includes("photo"), "a business with a site gets its logo from it");
  assert.ok(missingOf({ ...blank, website: "https://x.co.uk" }, true).includes("photo"), "a personal card still needs a photo");
});
