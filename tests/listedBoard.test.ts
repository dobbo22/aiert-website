import { test } from "node:test";
import assert from "node:assert/strict";
import { extractWebsiteNames, namedOnPage, parseOfficerName, pickCompany, searchNames } from "../lib/listedBoardParse";

test("Companies House names become people's names", () => {
  assert.equal(parseOfficerName("BRADFORD, Hugh Michael").display, "Hugh Bradford");
  assert.equal(parseOfficerName("SMITH-JONES, Dr Anne").display, "Anne Smith-Jones");
  assert.equal(parseOfficerName("O'BRIEN, Sean").display, "Sean O'Brien");
  assert.equal(parseOfficerName("SMITH-JONES, Dr Anne").first, "anne");
});

test("a person is found on a page by surname with first name or initial", () => {
  const p = parseOfficerName("BRADFORD, Hugh Michael");
  assert.ok(namedOnPage(p, "Our board: Hugh Bradford, Chairman"));
  assert.ok(namedOnPage(p, "Hugh M. Bradford is Chair"));
  assert.ok(namedOnPage(p, "Bradford, Hugh"));
  assert.ok(namedOnPage(p, "H. Bradford joined in 2020"));
  assert.ok(!namedOnPage(p, "Hugh Brown and Tim Bradfordshire"));
  assert.ok(!namedOnPage(p, "Bradford is a city in Yorkshire"));
});

test("the register match needs the same name and does not guess between two", () => {
  const c = (title: string, number: string, status = "active", type = "plc") => ({ title, number, status, type, address: "" });
  assert.equal(pickCompany("HSBC Hldgs plc", [c("HSBC UK BANK PLC", "1"), c("HSBC HOLDINGS PLC", "617987"), c("HSBC BANK PLC", "2")]).pick?.number, "617987");
  assert.equal(pickCompany("HSBC Hldgs plc", [c("HSBC UK BANK PLC", "1")]).pick, null);
  const two = pickCompany("Acme plc", [c("ACME PLC", "10"), c("ACME PLC", "11")]);
  assert.equal(two.pick, null);
  assert.match(two.why, /choose by hand/);
  assert.equal(pickCompany("Acme plc", [c("ACME PLC", "10", "dissolved"), c("ACME PLC", "11")]).pick?.number, "11");
});

test("names and roles are lifted from a board page", () => {
  const html = `<div><h3>Hugh Bradford</h3><p>Non-Executive Chairman</p></div><div><h3>Sarah Clarke</h3><p>Chief Executive Officer</p></div><h2>Our Board</h2><p>Contact us</p>`;
  const n = extractWebsiteNames(html);
  assert.deepEqual(n.map((x) => x.name), ["Hugh Bradford", "Sarah Clarke"]);
  assert.equal(n[1].role, "Chief Executive Officer");
});

test("Mc names are capitalised, committee lists are not read as roles, abbreviations are written out for the search", () => {
  assert.equal(parseOfficerName("MCCONVILLE, Coline").display, "Coline McConville");
  const html = `<p>Liz Hewitt</p><p>(Chair), Martin Gilbert</p><p>Kalidas Madhavpeddi</p><p>(Chair) and all other Non-Executive Directors</p>`;
  assert.deepEqual(extractWebsiteNames(html), []);
  assert.ok(searchNames("HSBC Hldgs plc").includes("HSBC Holdings"));
});
