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
  const mk = (over: Partial<import("../lib/businessUsers").BizRow>) => ({ id: "x", name: "", company: "", email: "", website: "", label: "", created_at: "2026-11-01T00:00:00Z", views: 0, qr: 0, saves: 0, followers: 0, claims: 0, offers: 0, news: 0, ...none, signup: "free" as const, detail: "", emailKind: "none" as const, emailDomain: "", emailOnSite: false, looksTest: false, fromApp: false, isPersonal: false, ...over });
  const rows = [mk({ id: "a", company: "The Daily Grind Coffee House" }), mk({ id: "b", company: "Bella Café", followers: 12, offers: 2 }), mk({ id: "c", company: "Joe's Plumbing" }), mk({ id: "d", name: "Sam", website: "https://beanandbrew.co.uk" })];
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ q: b.COFFEE_WORDS.join(",") })).map((r) => r.id), ["a", "b", "d"]);
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ q: b.COFFEE_WORDS.join(","), little: "1" })).map((r) => r.id), ["a", "d"], "Bella Cafe is active so it is left out");
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ type: "company" })).length, 0);
  assert.match(b.toCsv(rows).split("\n")[0], /Sign-up type/);
  assert.equal(b.toCsv([mk({ company: 'Say "hi", Ltd' })]).split("\n")[1].startsWith('"Say ""hi"", Ltd"'), true);
});

test("own-domain email and test-card detection", () => {
  assert.deepEqual(b.emailInfo("owner@gmail.com", "https://cafe.co.uk"), { kind: "free", domain: "gmail.com", onSite: false });
  assert.equal(b.emailInfo("a@talktalk.net", "").kind, "free", "UK provider not in the shared list");
  assert.equal(b.emailInfo("a@virginmedia.com", "").kind, "free");
  assert.deepEqual(b.emailInfo("hello@beanandbrew.co.uk", "https://www.beanandbrew.co.uk/menu"), { kind: "own", domain: "beanandbrew.co.uk", onSite: true });
  assert.deepEqual(b.emailInfo("martin@othercompany.com", "https://beanandbrew.co.uk"), { kind: "own", domain: "othercompany.com", onSite: false });
  assert.equal(b.emailInfo("", "https://x.com").kind, "none");
  assert.equal(b.looksTest({ name: "", company: "Acme Coffee Roasting Co", website: "" }), true);
  assert.equal(b.looksTest({ name: "Sam", company: "Bean and Brew", website: "https://beanandbrew.co.uk" }), false);
  assert.equal(b.looksTest({ name: "Test User", company: "", website: "" }), true);
  const mk = (over: Partial<import("../lib/businessUsers").BizRow>) => ({ id: "x", name: "", company: "", email: "", website: "", label: "", created_at: "2026-11-01T00:00:00Z", views: 0, qr: 0, saves: 0, followers: 0, claims: 0, offers: 0, news: 0, ...none, signup: "free" as const, detail: "", emailKind: "none" as const, emailDomain: "", emailOnSite: false, looksTest: false, fromApp: false, isPersonal: false, ...over });
  const rows = [mk({ id: "a", emailKind: "own" }), mk({ id: "b", emailKind: "free" }), mk({ id: "c", emailKind: "own", looksTest: true }), mk({ id: "d" })];
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ email: "own" })).map((r) => r.id), ["a", "c"]);
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ email: "own", notest: "1" })).map((r) => r.id), ["a"]);
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ email: "any" })).map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ email: "none" })).map((r) => r.id), ["d"]);
});

test("relay addresses, ISPs and our own domains are not prospects", () => {
  assert.equal(b.emailInfo("x@privaterelay.appleid.com", "").kind, "free");
  assert.equal(b.emailInfo("x@telenet.be", "").kind, "free");
  assert.equal(b.looksTest({ name: "Martin", company: "AIERT", website: "https://aiert.co.uk", email: "martin@aiert.co.uk" }), true);
  assert.equal(b.looksTest({ name: "Sam", company: "Bean and Brew", website: "", email: "sam@beanandbrew.co.uk" }), false);
  const mk = (over: Partial<import("../lib/businessUsers").BizRow>) => ({ id: "x", name: "", company: "", email: "", website: "", label: "", created_at: "2026-11-01T00:00:00Z", views: 0, qr: 0, saves: 0, followers: 0, claims: 0, offers: 0, news: 0, ...none, signup: "free" as const, detail: "", emailKind: "own" as const, emailDomain: "", emailOnSite: false, looksTest: false, fromApp: true, isPersonal: false, ...over });
  const rows = [mk({ id: "a" }), mk({ id: "b", isPersonal: true }), mk({ id: "c", fromApp: false })];
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({})).map((r) => r.id), ["a", "c"], "personal cards hidden by default");
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ all: "1" })).map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(b.applyFilters(rows, b.parseFilters({ all: "1", app: "1" })).map((r) => r.id), ["a", "b"]);
});
