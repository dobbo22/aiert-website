import { before, test } from "node:test";
import assert from "node:assert/strict";
import { installStubs, sql } from "./helpers/pgdb";
installStubs();

before(async () => { const { getCard } = await import("../lib/tapcardDb"); await getCard("none"); });

async function card(website: string, name = "Salon", email = "") {
  const { createCard } = await import("../lib/tapcardDb");
  const { hashSecret } = await import("../lib/tapcardAuth");
  return createCard({ label: "Work", grouping_id: "", name, title: "", company: name, phone: "", email, website, address: "", linkedin_url: "", twitter_url: "", instagram_url: "", facebook_url: "", facebook_is_page: false, tiktok_url: "", whatsapp_url: "", photo_url: null } as never, hashSecret("t".repeat(40)), "ip");
}
const sub = (originalId: string, trial: boolean) => ({ until: new Date(Date.now() + 90 * 86_400_000), trial, platform: "ios" as const, productId: "com.mailbroom.tapcard.promote.year", originalId });

test("a business gets one free trial, not one per Apple ID", async () => {
  const { saveVerified, TrialUsedError } = await import("../lib/tapcardPromote");
  const a = await card("https://www.salon-trial.example");
  const b = await card("salon-trial.example/contact", "Salon again");
  assert.equal((await saveVerified(a, sub("APPLE-ID-1", true))).active, true, "the first trial is allowed");
  await assert.rejects(() => saveVerified(b, sub("APPLE-ID-2", true)), TrialUsedError, "the same business on a new Apple ID gets no second trial");
  assert.equal((await saveVerified(a, sub("APPLE-ID-1", true))).active, true, "the same subscription carries on");
  assert.equal((await saveVerified(b, sub("APPLE-ID-2", false))).active, true, "a paid purchase is never blocked");
});

test("a verified domain holds across a different website", async () => {
  const { saveVerified, TrialUsedError } = await import("../lib/tapcardPromote");
  const a = await card("https://verified-trial.example");
  const c = await card("https://other-site.example", "Moved website");
  await sql`UPDATE tapcard_cards SET verified_domain = 'verified-trial.example' WHERE id = ${c}`;
  await saveVerified(a, sub("APPLE-ID-3", true));
  await assert.rejects(() => saveVerified(c, sub("APPLE-ID-4", true)), TrialUsedError);
});

test("a different business is unaffected", async () => {
  const { saveVerified } = await import("../lib/tapcardPromote");
  const d = await card("https://unrelated-trial.example");
  assert.equal((await saveVerified(d, sub("APPLE-ID-5", true))).active, true);
});

test("the same email address holds across a different website", async () => {
  const { saveVerified, TrialUsedError } = await import("../lib/tapcardPromote");
  const a = await card("https://email-one.example", "First", "Owner@Same-Mail.example");
  const b = await card("https://email-two.example", "Second", "owner@same-mail.example");
  const c = await card("https://email-three.example", "Third", "someone.else@mail.example");
  await saveVerified(a, sub("APPLE-ID-6", true));
  await assert.rejects(() => saveVerified(b, sub("APPLE-ID-7", true)), TrialUsedError, "same address, different case and website");
  assert.equal((await saveVerified(c, sub("APPLE-ID-8", true))).active, true, "a different address is unaffected");
});
