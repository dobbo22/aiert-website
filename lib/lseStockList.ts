// Reads the London Stock Exchange "Stock List" spreadsheets (list_of_sets_securities, list_of_setsqx_ccp_securities, list_of_setsqx_non_ccp_securities).
// An .xlsx file is a zip of XML files, so this uses the jszip package already in the project and needs no spreadsheet library.
//
// Which rows count as a listed company's shares (worked out from the list the app has used since 12 Nov 2026, and it matches it exactly):
//   - MiFIR identifier "SHRS" (shares; the lists also hold ETFs, depositary receipts and other products), and
//   - not segment "SSX4" (the SETSqx international equity service: foreign shares that trade in London but are not London listings).
// Market: a segment code starting with "A" is AIM (ASQ1, ASX1, AMSM); everything else is the Main Market.
import JSZip from "jszip";

export interface LseShare { isin: string; name: string; ticker: string; market: "Main" | "AIM"; country: string; segment: string; sector: string; currency: string }
export interface LseParsed { items: LseShare[]; asOf: string; skipped: number }

const unescapeXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/// The first sheet of an .xlsx file as rows of text.
export async function readXlsxRows(buf: Buffer | ArrayBuffer | Uint8Array): Promise<string[][]> {
  const zip = await JSZip.loadAsync(buf);
  const shared: string[] = [];
  const ss = zip.file("xl/sharedStrings.xml");
  if (ss) {
    const xml = await ss.async("string");
    for (const m of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      shared.push(unescapeXml([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
    }
  }
  const sheetName = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!sheetName) throw new Error("No worksheet found in the file.");
  const xml = await zip.file(sheetName)!.async("string");
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /\bt="(\w+)"/.exec(attrs)?.[1];
      const inner = cm[2] ?? "";
      let value = "";
      if (type === "s") value = shared[Number(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1])] ?? "";
      else if (type === "inlineStr") value = unescapeXml([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
      else value = unescapeXml(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "");
      row[colIndex(ref)] = value.trim();
    }
    rows.push(row);
  }
  return rows;
}

/// "3I GROUP PLC" -> "3i Group plc". Words with no vowel (BP, HSBC) stay in capitals.
export function tidyName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w) => {
      if (w === "plc") return "plc";
      if (w === "ltd") return "Ltd";
      if (w === "llp") return "LLP";
      if (/^[^aeiouy]{2,5}$/.test(w) && /[a-z]/.test(w)) return w.toUpperCase();
      return w.replace(/(^|[(&/-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
    })
    .join(" ")
    .replace(/^(\d+)i\b/i, (_, d) => d + "i");
}

/// One spreadsheet's rows into listed shares. Only the rules above are applied; nothing is guessed.
export function parseStockListRows(rows: string[][]): LseParsed {
  const head = rows.findIndex((r) => r.includes("ISIN") && r.includes("Issuer Name"));
  if (head < 0) throw new Error("This does not look like an LSE stock list (no ISIN and Issuer Name columns).");
  const col = (name: string) => rows[head].indexOf(name);
  const c = { seg: col("Segment"), sec: col("Sector"), name: col("Issuer Name"), isin: col("ISIN"), mifir: col("MiFIR Identifier"), cur: col("Currency"), country: col("Country of Register"), tick: col("Mnemonic") };
  if ([c.seg, c.name, c.isin, c.mifir, c.tick].some((i) => i < 0)) throw new Error("The stock list is missing a column this page needs (Segment, Issuer Name, ISIN, MiFIR Identifier, Mnemonic).");
  const asOfText = rows.slice(0, head).flat().find((t) => /last updated on/i.test(t ?? "")) ?? "";
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(asOfText);
  const asOf = m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  const items: LseShare[] = [];
  let skipped = 0;
  for (const r of rows.slice(head + 1)) {
    const isin = (r[c.isin] ?? "").toUpperCase();
    if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) continue;
    const segment = r[c.seg] ?? "";
    if ((r[c.mifir] ?? "") !== "SHRS" || segment === "SSX4") { skipped++; continue; }
    const country = (r[c.country] ?? "").toUpperCase();
    items.push({
      isin,
      name: tidyName(r[c.name] ?? ""),
      ticker: (r[c.tick] ?? "").trim(),
      market: segment.startsWith("A") ? "AIM" : "Main",
      // "ZZ" is the exchange's "not known" marker: fall back to where the ISIN was issued.
      country: !country || country === "ZZ" ? isin.slice(0, 2) : country,
      segment,
      sector: r[c.sec] ?? "",
      currency: r[c.cur] ?? "",
    });
  }
  return { items, asOf, skipped };
}

/// Several spreadsheets together (the three LSE lists). A share in more than one list, or on more than one currency line, is kept once (the sterling line if there is one).
export async function parseStockListFiles(files: { name: string; data: Buffer | ArrayBuffer | Uint8Array }[]): Promise<LseParsed & { perFile: { name: string; shares: number; asOf: string }[] }> {
  const seen = new Map<string, LseShare>();
  const perFile: { name: string; shares: number; asOf: string }[] = [];
  let skipped = 0;
  let asOf = "";
  for (const f of files) {
    const parsed = parseStockListRows(await readXlsxRows(f.data));
    perFile.push({ name: f.name, shares: parsed.items.length, asOf: parsed.asOf });
    skipped += parsed.skipped;
    if (parsed.asOf && parsed.asOf > asOf) asOf = parsed.asOf;
    // A share can have several lines (one per currency, each with its own ticker). Keep the sterling line, else the first one seen.
    for (const it of parsed.items) {
      const have = seen.get(it.isin);
      if (!have || (!/^(GBX|GBP)$/.test(have.currency) && /^(GBX|GBP)$/.test(it.currency))) seen.set(it.isin, it);
    }
  }
  return { items: [...seen.values()], asOf, skipped, perFile };
}
