import { test } from "node:test";
import assert from "node:assert/strict";
import { searchListed, listedByIsin } from "../lib/tapcardListed";

test("a company is found by name, by part of its name, and by ticker", () => {
  assert.ok(searchListed("steppe").some((c) => c.n.startsWith("Steppe Cement")));
  assert.ok(searchListed("cement steppe").some((c) => c.n.startsWith("Steppe Cement")), "words in any order");
  assert.equal(searchListed("III")[0]?.n, "3i Group plc", "a ticker match comes first");
});
test("short or empty searches return nothing, and the limit is respected", () => {
  assert.deepEqual(searchListed(""), []);
  assert.deepEqual(searchListed("a"), []);
  assert.ok(searchListed("plc", 5).length <= 5);
});
test("only share lines on the main market and AIM are in the list", () => {
  const sample = searchListed("plc", 50);
  assert.ok(sample.length > 0 && sample.every((c) => c.m === "Main" || c.m === "AIM"));
  assert.equal(listedByIsin("not an isin"), undefined);
});

import { pickListedHit } from "../lib/tapcardListed";
test("a map listing is accepted only when it is the same company and has a website", () => {
  const steppe = { n: "Steppe Cement Ltd" };
  assert.equal(pickListedHit(steppe, [{ name: "Steppe Cement Limited", website: "https://www.steppecement.com/" }])?.website, "https://www.steppecement.com/");
  assert.equal(pickListedHit(steppe, [{ name: "Steppe Travel Ltd", website: "https://travel.example" }]), null, "another company with one word in common");
  assert.equal(pickListedHit(steppe, [{ name: "Steppe Cement Ltd", website: "" }]), null, "no website, nothing to show");
  assert.equal(pickListedHit({ n: "Anglo American Resources plc" }, [{ name: "Anglo American plc", website: "https://angloamerican.com" }])?.website, "https://angloamerican.com");
});

import { manualWebsite } from "../lib/tapcardListed";
test("a website set by hand is found by ISIN, and an unknown ISIN has none", () => {
  assert.equal(manualWebsite("GB00BD8GP619"), "https://www.kefi-goldandcopper.com/");
  assert.equal(manualWebsite("gb00bd8gp619"), "https://www.kefi-goldandcopper.com/", "case does not matter");
  assert.equal(manualWebsite("XX0000000000"), "");
});
