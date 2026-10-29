import test from "node:test";
import assert from "node:assert/strict";
import { appleMapsQuery } from "../lib/mapsQuery";

test("Apple Maps is asked for the place by name and street, without the house number", () => {
  assert.equal(appleMapsQuery("5A Formosa St, London W9 1EE", "Prince Alfred"), "Prince Alfred, Formosa St, London W9 1EE");
  assert.equal(appleMapsQuery("14 Formosa St, London W9 1EE", "Chakra Little Venice"), "Chakra Little Venice, Formosa St, London W9 1EE");
  assert.equal(appleMapsQuery("Unit 5, Hayes UB3 4DJ", "Group Hayes"), "Group Hayes, Unit 5, Hayes UB3 4DJ");
  assert.equal(appleMapsQuery("5A Formosa St, London W9 1EE", ""), "5A Formosa St, London W9 1EE", "no name: the address as it is");
  assert.equal(appleMapsQuery("W9 1EE", "Prince Alfred"), "Prince Alfred, W9 1EE");
});
