import { test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

let b: typeof import("../lib/businessUsers");
import { before } from "node:test";
before(async () => { b = await import("../lib/businessUsers"); });

const none = { org_id: null, org_name: null, billing_status: null, org_created: null, promote_until: null, promote_trial: false, promote_platform: null, grant_until: null };
const now = Date.parse("2026-11-10T12:00:00Z");

test("each business is classed by how it signed up", () => {
  assert.equal(b.signupOf(none, now).signup, "free");
  assert.equal(b.signupOf({ ...none, org_id: "o1", org_name: "Acme Cafes", billing_status: "active" }, now).detail, "Acme Cafes: paid plan");
  const trial = b.signupOf({ ...none, org_id: "o1", org_name: "Acme", billing_status: "incomplete", org_created: "2026-11-01T00:00:00Z" }, now);
  assert.equal(trial.signup, "company");
  assert.match(trial.detail, /free trial until 2026-12-01/);
  assert.match(b.signupOf({ ...none, org_id: "o1", org_name: "Acme", billing_status: "incomplete", org_created: "2026-09-01T00:00:00Z" }, now).detail, /trial ended/);
  const store = b.signupOf({ ...none, promote_until: "2027-02-01T00:00:00Z", promote_trial: true, promote_platform: "ios" }, now);
  assert.equal(store.signup, "store");
  assert.match(store.detail, /ios: free trial until 2027-02-01/);
  assert.equal(b.signupOf({ ...none, grant_until: "2027-01-01T00:00:00Z" }, now).signup, "grant");
  // a company card wins over a store subscription on the same card
  assert.equal(b.signupOf({ ...none, org_id: "o1", billing_status: "active", promote_until: "2027-02-01T00:00:00Z" }, now).signup, "company");
});

test("coffee-house and little-used filters", () => {
  const mk = (over: Partial<import("../lib/businessUsers").BizRow>) => ({ id: "x", name: "", company: "", email: "", website: "", label: "", created_at: "2026-11-01T00:00:00Z", views: 0, qr: 0, saves: 0, followers: 0, claims: 0, offers: 0, news: 0, ...none, signup: "free" as const, detail: "", ...over });
  const rows = [mk({ id: "a", company: "The Daily Grind Coffee House" }), mk({ id: "b", company: "Bella Café", followers: 12, offers: 2 }), mk({ id: "c", company: "Joe's Plumbing" }), mk({ id: "d", name: "Sam", website: "https://beanandbrew.co.uk" })];
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ q: b.COFFEE_WORDS.join(",") })).map((r) => r.id), ["a", "b", "d"]);
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ q: b.COFFEE_WORDS.join(","), little: "1" })).map((r) => r.id), ["a", "d"], "Bella Cafe is active so it is left out");
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ type: "company" })).length, 0);
  assert.match(b.toCsv(rows).split("\n")[0], /Sign-up type/);
  assert.equal(b.toCsv([mk({ company: 'Say "hi", Ltd' })]).split("\n")[1].startsWith('"Say ""hi"", Ltd"'), true);
});
