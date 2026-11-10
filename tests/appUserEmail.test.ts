import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmail, topFixes } from "../lib/appUserEmail";

const base = { firstName: "Sam", business: "Bean & Brew <Ltd>", personal: false, missing: ["photo", "website", "links", "linkedin", "address", "title"] as never[], sentTo: 0, imageBase: "https://x.test/img", guideUrl: "https://x.test/guide", replyTo: "martin@aiert.co.uk" };

test("the three most useful gaps are chosen, in order", () => {
  assert.deepEqual(topFixes(["title", "linkedin", "website", "photo"] as never[], false), ["website", "photo", "linkedin"]);
  assert.deepEqual(topFixes(["links", "title"] as never[], true), ["title"], "personal cards are not told to add booking links");
  assert.deepEqual(topFixes([], false), []);
});

test("the email is personalised by fixes, and never reveals that we looked at their data", () => {
  const e = buildEmail(base);
  assert.match(e.subject, /^Sam, 3 quick things to get more from your TapCard$/);
  assert.match(e.text, /Thanks for downloading TapCard\. Here are three small things that would make it work much harder for you:/);
  assert.match(e.html, /Add your website/);
  // nothing that shows we checked their card: no business name, no "I had a look", no talk of how much they have shared
  for (const out of [e.html, e.text, e.subject]) {
    assert.doesNotMatch(out, /Brew|I had a look|hasn't been sent|already sent|well filled in|good start/i);
  }
  assert.doesNotMatch(e.html + e.text, /free app|free TapCard app|no app needed/i);
  assert.match(e.text, /three cards on one phone/);
  assert.match(e.html, /https:\/\/x\.test\/img\/qr-branded\.jpg/);
});

test("the wording follows how many fixes there are, and is the same however much they have shared", () => {
  assert.match(buildEmail({ ...base, missing: ["social"] as never[] }).text, /Here is one small thing that would make it work much harder/);
  assert.match(buildEmail({ ...base, missing: ["social", "title"] as never[] }).text, /Here are two small things that would/);
  assert.equal(buildEmail(base).text.includes("send yours to three people"), true);
  assert.equal(buildEmail({ ...base, sentTo: 2 }).text, buildEmail({ ...base, sentTo: 0 }).text, "sharing history does not change the email");
  const done = buildEmail({ ...base, missing: [] });
  assert.match(done.subject, /get more from your TapCard/);
  assert.match(done.text, /Thanks for downloading TapCard\. The next step is getting your card in front of people\./);
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

test("every fix links to the guide step that shows how, and those steps exist", async () => {
  const { readFileSync } = await import("node:fs");
  const { GUIDE_STEPS, stepId } = await import("../lib/appUserEmail");
  const e = buildEmail(base); // fixes: website, photo, links
  assert.match(e.html, /href="https:\/\/x\.test\/guide#fill-in-what-your-card-is-missing"/);
  assert.match(e.html, /href="https:\/\/x\.test\/guide#bookings-shop-and-more-for-your-business"/);
  assert.match(e.html, /href="https:\/\/x\.test\/guide#share-your-card"/);
  assert.match(e.html, /href="https:\/\/x\.test\/guide#get-their-details-back"/);
  assert.match(e.text, /How: https:\/\/x\.test\/guide#share-your-card/);
  assert.equal(stepId("Bookings, shop and more for your business"), "bookings-shop-and-more-for-your-business");
  // the guide page must still contain each of these step titles, or the link would land at the top of the page
  const guide = readFileSync(new URL("../app/tapcard/guide/page.tsx", import.meta.url), "utf8");
  for (const title of Object.values(GUIDE_STEPS)) assert.ok(guide.includes(`title: "${title}"`), `guide step missing: ${title}`);
  assert.match(guide, /id=\{s\.title\.toLowerCase\(\)/, "the guide gives each step an id");
});

test("the real send skips unsubscribed and already-sent addresses, case-insensitively", async () => {
  const { installStubs } = await import("./helpers/pgdb");
  installStubs();
  const { eligibleRecipients } = await import("../lib/appUserCampaign");
  const list = [{ email: "A@x.com" }, { email: "b@x.com" }, { email: "c@x.com" }, { email: "d@x.com" }];
  const r = eligibleRecipients(list, new Set(["b@x.com"]), new Set(["a@x.com"]));
  assert.deepEqual(r.eligible.map((x) => x.email), ["c@x.com", "d@x.com"]);
  assert.equal(r.suppressedCount, 1);
  assert.equal(r.alreadySentCount, 1);
  assert.deepEqual(eligibleRecipients(list, new Set(), new Set()).eligible.length, 4);
});

test("private audience uses its own campaign key and defaults to own-domain", async () => {
  const { parseAudience, campaignFor, CAMPAIGN, CAMPAIGN_PRIVATE, PRIVATE_SKIP_DOMAINS } = await import("../lib/appUserCampaign");
  assert.equal(parseAudience("private"), "private");
  assert.equal(parseAudience(undefined), "own");
  assert.equal(parseAudience("anything"), "own");
  assert.equal(campaignFor("own"), CAMPAIGN);
  assert.notEqual(CAMPAIGN_PRIVATE, CAMPAIGN);
  assert.ok(PRIVATE_SKIP_DOMAINS.includes("privaterelay.appleid.com"));
});
