import { test } from "node:test";
import assert from "node:assert/strict";
import { installStubs } from "./helpers/pgdb";
installStubs();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { investorLabel } = require("../lib/siteLinks") as typeof import("../lib/siteLinks");

test("the app's own finder recognises the same investor links, including .html addresses", () => {
  assert.equal(investorLabel("stock exchange announcements", "/investor-relations/stock-exchange-announcements.html"), "RNS announcements");
  assert.equal(investorLabel("shareholder information", "/investor-relations/shareholder-information.html"), "Shareholder information");
  assert.equal(investorLabel("investors", "/investor-relations.html"), "Investor relations");
  assert.equal(investorLabel("investors", "/investors"), "Investor relations");
  assert.equal(investorLabel("our people", "/about/people"), "");
  assert.equal(investorLabel("uk regulatory announcements", "/investors/news-and-filings/uk-regulatory-announcements.html"), "RNS announcements");
});
