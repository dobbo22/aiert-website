import test from "node:test";
import assert from "node:assert/strict";
import { helpFor } from "../lib/guideLinks";

test("each page points at the part of the guide that explains it, for the reader's role", () => {
  assert.equal(helpFor("/business/admin", null, "company-senior").href, "/business/investor-guide/setup#steps");
  assert.equal(helpFor("/tapcard/business/admin/news", null, "company-senior").href, "/business/investor-guide?as=company-senior#post-regulatory");
  assert.equal(helpFor("/business/admin/news", "approvals", "company-senior").href, "/business/investor-guide?as=company-senior#approve");
  assert.equal(helpFor("/business/admin/news", "audiences", "company-senior").href, "/business/investor-guide?as=company-senior#groups");
  assert.equal(helpFor("/business/admin/news", "people", "company-senior").href, "/business/investor-guide?as=company-senior#seniors");
  assert.equal(helpFor("/business/admin/news", "audit", "company-senior").href, "/business/investor-guide?as=company-senior#audit");
  assert.equal(helpFor("/business/admin/billing", null, "company-senior").href, "/business/investor-guide/setup#who-pays");
});

test("a general admin is pointed at what they can actually do, not senior-only tasks", () => {
  assert.equal(helpFor("/business/admin/news", null, "company-general").href, "/business/investor-guide?as=company-general#regulatory-general");
  assert.equal(helpFor("/business/admin/news", "approvals", "company-general").href, "/business/investor-guide?as=company-general#not-allowed");
  assert.equal(helpFor("/business/admin/news", "audit", "company-general").href, "/business/investor-guide?as=company-general#not-allowed");
});

test("the adviser portal has its own help", () => {
  assert.equal(helpFor("/business/adviser", null, "adviser-senior").href, "/business/investor-guide?as=adviser-senior#ask");
  assert.equal(helpFor("/business/adviser/abc", null, "adviser-general").href, "/business/investor-guide?as=adviser-general#post-adviser");
  assert.equal(helpFor("/business/adviser/abc", "audiences", "adviser-senior").href, "/business/investor-guide?as=adviser-senior#groups-adviser");
});
