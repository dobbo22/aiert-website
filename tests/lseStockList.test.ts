import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { parseStockListFiles, parseStockListRows, readXlsxRows, tidyName } from "../lib/lseStockList";

const HEAD = ["Segment", "Sector", "Issuer Name", "ISIN", "Security Type", "MiFIR Identifier", "Currency", "Trading Parameter Code", "Price Tick Table ID", "Country of Register", "Mnemonic"];
const row = (seg: string, name: string, isin: string, mifir: string, tick: string, country = "GB") => [seg, "X", name, isin, "DE", mifir, "GBX", "", "", country, tick];

test("tidyName makes list names readable", () => {
  assert.equal(tidyName("3I GROUP PLC"), "3i Group plc");
  assert.equal(tidyName("HSBC HOLDINGS PLC"), "HSBC Holdings plc");
  assert.equal(tidyName("BP PLC"), "BP plc");
  assert.equal(tidyName("PERSHING SQUARE HOLDINGS LTD"), "Pershing Square Holdings Ltd");
});

test("only shares count: ETFs and the international service are left out; AIM segments start with A", () => {
  const p = parseStockListRows([
    [], ["Stock List for SETS"], ["File last updated on 15/12/2025"], HEAD,
    row("SET1", "3I GROUP PLC", "GB00B1YW4409", "SHRS", "III"),
    row("ASQ1", "450 PLC", "JE00BZBYC658", "SHRS", "450", "JE"),
    row("SSX4", "SOME FOREIGN SA", "ES0113900J37", "SHRS", "SAN"),
    row("SSX4", "SOME ETF", "IE00B4L5Y983", "ETFS", "IWDA"),
    row("SET3", "ODD ONE PLC", "GB00BK6RLF66", "SHRS", "ODD", "ZZ"),
  ]);
  assert.equal(p.asOf, "2025-12-15");
  assert.deepEqual(p.items.map((i) => [i.isin, i.market, i.country]), [["GB00B1YW4409", "Main", "GB"], ["JE00BZBYC658", "AIM", "JE"], ["GB00BK6RLF66", "Main", "GB"]]);
  assert.equal(p.skipped, 2);
});

test("a file that is not an LSE list is refused", () => {
  assert.throws(() => parseStockListRows([["a", "b"], ["1", "2"]]), /LSE stock list/);
});

async function makeXlsx(rows: string[][]): Promise<Uint8Array> {
  const zip = new JSZip();
  const strings: string[] = [];
  const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
    if (v === undefined || v === "") return "";
    strings.push(v);
    return `<c r="${String.fromCharCode(65 + ci)}${ri + 1}" t="s"><v>${strings.length - 1}</v></c>`;
  }).join("")}</row>`).join("");
  zip.file("xl/worksheets/sheet1.xml", `<worksheet><sheetData>${sheetRows}</sheetData></worksheet>`);
  zip.file("xl/sharedStrings.xml", `<sst>${strings.map((s) => `<si><t>${s.replace(/&/g, "&amp;")}</t></si>`).join("")}</sst>`);
  return zip.generateAsync({ type: "uint8array" });
}

test("reads an .xlsx and merges several files, keeping a repeated ISIN once", async () => {
  const a = await makeXlsx([[""], ["File last updated on 15/12/2025"], HEAD, row("SET1", "A & B PLC", "GB0000000001", "SHRS", "AB")]);
  const b = await makeXlsx([[""], ["File last updated on 16/12/2025"], HEAD, row("ASX1", "A & B PLC", "GB0000000001", "SHRS", "AB"), row("ASX1", "C PLC", "GB0000000019", "SHRS", "C")]);
  assert.deepEqual((await readXlsxRows(a))[2].slice(0, 4), HEAD.slice(0, 4));
  const merged = await parseStockListFiles([{ name: "a.xlsx", data: a }, { name: "b.xlsx", data: b }]);
  assert.equal(merged.items.length, 2);
  assert.equal(merged.items[0].name, "A & B plc".replace("plc", "plc"));
  assert.equal(merged.items[0].market, "Main");
  assert.equal(merged.asOf, "2025-12-16");
});
