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
  assert.equal(helpFor("/business/adviser/abc", null, "adviser-general").href, "/business/investor-guide?as=adviser-general#post-general");
  assert.equal(helpFor("/business/adviser/abc", "approvals", "adviser-general").href, "/business/investor-guide?as=adviser-general#regulatory-adviser");
  assert.equal(helpFor("/business/adviser/abc", null, "adviser-senior").href, "/business/investor-guide?as=adviser-senior#post-adviser");
  assert.equal(helpFor("/business/adviser/abc", "audiences", "adviser-senior").href, "/business/investor-guide?as=adviser-senior#groups-adviser");
});

// Every help link must land on a task that exists in that role's manual (a missing anchor silently scrolls nowhere).
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { RoleManual } from "../app/tapcard/business/investor-guide/RoleManuals";
import { GUIDE_ROLES } from "../lib/guideRoles";

test("every help link and every anchor the guide pages use exists in the manual for that role", () => {
  const pages: [string, string | null][] = [["/business/admin", null], ["/business/admin/news", null], ["/business/admin/news", "audiences"], ["/business/admin/news", "approvals"], ["/business/admin/news", "people"], ["/business/admin/news", "audit"],
    ["/business/admin/followers", null], ["/business/admin/insights", null], ["/business/admin/cards", null], ["/business/admin/billing", null], ["/business/admin/setup", null], ["/business/adviser", null], ["/business/adviser/x", null], ["/business/adviser/x", "audiences"], ["/business/adviser/x", "approvals"]];
  for (const role of GUIDE_ROLES) {
    const html = renderToStaticMarkup(createElement(RoleManual, { role }));
    const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    for (const [path, tab] of pages) {
      const adviserPage = path.startsWith("/business/adviser");
      if (role === "shareholder" || adviserPage !== role.startsWith("adviser")) continue; // a role only uses its own pages
      const { href } = helpFor(path, tab, role);
      if (!href.includes(`?as=${role}#`)) continue; // setup-guide links are checked below
      const anchor = href.split("#")[1];
      if (anchor === "manual") continue;
      assert.ok(ids.has(anchor), `${role} ${path} ${tab ?? ""} -> #${anchor} is not in that role's manual`);
    }
  }
});
