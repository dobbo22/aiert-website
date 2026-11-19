import test from "node:test";
import assert from "node:assert/strict";
import { attentionItems, nextStep, setupSteps, type OverviewInput } from "../lib/tapcardOverviewTasks";

const base: OverviewInput = {
  viewer: { email: "ceo@x.com", senior: true }, waitingDrafts: [], adviserRequests: 0, seniorCount: 2, adminCount: 3, approvalOn: false,
  announcementsPageSet: true, privacyUrlSet: true, teamCards: 2, events: 1, hasPosted: true, shared: 3, adviserCover: [], adviserPaymentProblem: null,
};

test("a quiet account has nothing needing attention", () => {
  assert.deepEqual(attentionItems(base), []);
});

test("a senior admin is told about drafts from others, adviser requests, and a second-approval setup that cannot work", () => {
  const items = attentionItems({ ...base, approvalOn: true, seniorCount: 1, waitingDrafts: [{ createdBy: "ir@x.com" }, { createdBy: "ceo@x.com" }], adviserRequests: 2 });
  const ids = items.map((x) => x.id);
  assert.ok(ids.includes("one-senior") && ids.includes("approvals") && ids.includes("adviser-request") && ids.includes("my-drafts"));
  assert.match(items.find((x) => x.id === "approvals")!.text, /^1 headline is waiting/, "your own draft is not counted as waiting for you");
});

test("a general admin sees their own drafts waiting, and none of the senior-only items", () => {
  const items = attentionItems({ ...base, viewer: { email: "ir@x.com", senior: false }, waitingDrafts: [{ createdBy: "ir@x.com" }, { createdBy: "someone@x.com" }], adviserRequests: 1, approvalOn: true, seniorCount: 1 });
  assert.deepEqual(items.map((x) => x.id), ["my-drafts"]);
});

test("adviser payment problems and ending cover are shown to seniors only", () => {
  const input = { ...base, adviserCover: [{ adviserName: "IFC", ending: true, until: "2027-05-19T00:00:00Z" }], adviserPaymentProblem: "IFC" };
  assert.deepEqual(attentionItems(input).map((x) => x.id).sort(), ["adviser-payment", "cover-ending"]);
  assert.deepEqual(attentionItems({ ...input, viewer: { email: "ir@x.com", senior: false } }), []);
});

test("an unset announcements page is flagged for everyone", () => {
  assert.deepEqual(attentionItems({ ...base, announcementsPageSet: false, viewer: { email: "ir@x.com", senior: false } }).map((x) => x.id), ["announcements-page"]);
});

test("set-up steps tick themselves and the next step skips what this person can't do", () => {
  const fresh: OverviewInput = { ...base, adminCount: 1, seniorCount: 1, announcementsPageSet: false, privacyUrlSet: false, teamCards: 0, events: 0, hasPosted: false, shared: 0 };
  const steps = setupSteps(fresh, "card1");
  assert.equal(steps.find((s) => s.id === "card")!.done, true);
  assert.equal(steps.find((s) => s.id === "admins")!.done, false);
  assert.equal(steps.find((s) => s.id === "approval")!.done, true, "second approval can't be on with one senior, so it isn't asked of you yet");
  assert.equal(nextStep(steps, true)!.id, "admins");
  assert.equal(nextStep(steps, false)!.id, "page", "a general admin is not sent to a senior-only step");
  const done = setupSteps({ ...base, approvalOn: true }, "card1").map((s) => (s.id === "qr" ? { ...s, done: true } : s));
  assert.equal(nextStep(done, true), null);
});
