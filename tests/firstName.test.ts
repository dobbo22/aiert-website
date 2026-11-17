import { test } from "node:test";
import assert from "node:assert/strict";
import { firstNameOf, initialsOf } from "../lib/tapcardName";

test("first name skips titles", () => {
  assert.equal(firstNameOf("Sam Patel"), "Sam");
  assert.equal(firstNameOf("Dr Alexandrina Featherstonehaugh-Cholmondeley-Montgomery"), "Alexandrina");
  assert.equal(firstNameOf("Prof. Jane Holloway"), "Jane");
  assert.equal(firstNameOf("Sir Michael Caine"), "Michael");
  assert.equal(firstNameOf("Dr Smith"), "Dr Smith", "a title and one name stays together");
  assert.equal(firstNameOf("Dr"), "Dr");
  assert.equal(firstNameOf("  Madonna "), "Madonna");
  assert.equal(firstNameOf(""), "");
  assert.equal(firstNameOf(null), "");
});

test("initials for a card with no picture", () => {
  assert.equal(initialsOf("Corner Cafe"), "CC");
  assert.equal(initialsOf("Meridian Resources plc"), "MR");
  assert.equal(initialsOf("Sam Patel"), "SP");
  assert.equal(initialsOf("Dr Alexandrina Featherstonehaugh"), "AF");
  assert.equal(initialsOf("Joe's Plumbing"), "JP");
  assert.equal(initialsOf("Madonna"), "M");
  assert.equal(initialsOf("élan studios"), "ÉS");
  assert.equal(initialsOf(""), "?");
});
