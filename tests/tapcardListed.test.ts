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
