"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UniverseRow, ImportDiff } from "@/lib/tapcardListedUniverse";

type Preview = { deleted?: number; kept?: number; perFile: { name: string; shares: number; asOf: string }[]; diff: ImportDiff; complete: boolean; applied: boolean; skippedNonShares?: number };

const card = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 16, padding: 20 } as const;
const field = { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.08)", color: "inherit" } as const;
const btn = { padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.45)", background: "transparent", color: "inherit", cursor: "pointer" } as const;
const primary = { ...btn, background: "#FBBF24", color: "#111", fontWeight: 700, border: "none" } as const;
const PAGE = 100;

export function money(n: number | null): string {
  if (n === null) return "";
  if (n >= 1e9) return `£${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}bn`;
  if (n >= 1e6) return `£${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}m`;
  return `£${Math.round(n / 1e3)}k`;
}

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ListedView({ rows, loadError }: { rows: UniverseRow[]; loadError: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [market, setMarket] = useState("all");
  const [status, setStatus] = useState("listed");
  const [web, setWeb] = useState("all");
  const [cap, setCap] = useState("all");
  const [sortBy, setSortBy] = useState<"cap" | "name" | "ticker">("cap");
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [alsoDelete, setAlsoDelete] = useState(true);

  const listed = rows.filter((r) => r.status === "listed");
  const delisted = rows.length - listed.length;
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (market !== "all" && r.market !== market) return false;
      if (web === "yes" && !r.website) return false;
      if (web === "no" && r.website) return false;
      if (cap === "yes" && r.marketCap === null) return false;
      if (cap === "no" && r.marketCap !== null) return false;
      if (cap === "100m" && !((r.marketCap ?? 0) >= 1e8)) return false;
      if (cap === "10m" && !((r.marketCap ?? 0) >= 1e7)) return false;
      const hay = `${r.name} ${r.ticker} ${r.isin} ${r.sector}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    out.sort((a, b) =>
      sortBy === "cap" ? (b.marketCap ?? -1) - (a.marketCap ?? -1) || a.name.localeCompare(b.name) : sortBy === "ticker" ? a.ticker.localeCompare(b.ticker) : a.name.localeCompare(b.name));
    return out;
  }, [rows, q, market, status, web, cap, sortBy]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const visible = shown.slice(page * PAGE, page * PAGE + PAGE);

  async function json(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/tapcard/listed-universe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  }
  async function upload(action: "preview" | "apply") {
    setBusy(true); setMsg("");
    const form = new FormData();
    form.set("action", action);
    if (alsoDelete) form.set("remove", "1");
    for (const f of files) form.append("files", f);
    const res = await fetch("/api/admin/tapcard/listed-universe", { method: "POST", body: form });
    const r = (await res.json().catch(() => ({}))) as Partial<Preview> & { error?: string };
    setBusy(false);
    if (!res.ok || r.error) { setMsg(r.error ?? "Something went wrong."); return; }
    setPreview(r as Preview);
    if (action === "apply") { setMsg("Applied. The table below is up to date."); setFiles([]); router.refresh(); }
  }
  async function load() {
    setBusy(true); setMsg("");
    const r = await json({ action: "load" });
    setBusy(false);
    if (r.error) setMsg(r.error); else { setMsg(`Loaded ${r.added} companies.`); router.refresh(); }
  }
  async function removeDelisted() {
    if (!window.confirm(`Delete the ${delisted} companies marked delisted? Any that have a TapCard listed-company card are kept.`)) return;
    setBusy(true);
    const r = await json({ action: "remove-delisted" });
    setBusy(false);
    setMsg(`Deleted ${r.deleted}. Kept ${r.kept} that have a card.`);
    router.refresh();
  }
  async function editWebsite(row: UniverseRow) {
    const v = window.prompt(`Website for ${row.name} (leave empty to clear):`, row.website);
    if (v === null) return;
    const r = await json({ action: "set-website", isin: row.isin, website: v });
    if (r.error) setMsg(r.error); else router.refresh();
  }
  function exportCsv() {
    const head = ["Name", "Ticker", "ISIN", "Market", "Country", "Sector", "Status", "Market cap (GBP)", "Market cap as of", "Website", "Website source"];
    const lines = [head.join(",")].concat(shown.map((r) => [r.name, r.ticker, r.isin, r.market, r.country, r.sector, r.status, r.marketCap, r.marketCapAt, r.website, r.websiteSource].map(csvCell).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "listed-universe.csv";
    a.click();
  }

  const tile = (n: number | string, label: string) => (
    <div style={{ ...card, padding: 14, minWidth: 130 }}><div style={{ fontSize: 26, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 14 }}>{label}</div></div>
  );
  const d = preview?.diff;
  const list = (title: string, items: string[], open = false) =>
    items.length > 0 && (
      <details open={open} style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>{title} ({items.length})</summary>
        <ul style={{ margin: "6px 0 0 18px", fontSize: 14, maxHeight: 220, overflow: "auto" }}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </details>
    );

  return (
    <div className="text-cloud" style={{ display: "grid", gap: 24 }}>
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {tile(listed.length, "listed share lines")}
        {tile(listed.filter((r) => r.market === "Main").length, "Main Market")}
        {tile(listed.filter((r) => r.market === "AIM").length, "AIM")}
        {tile(listed.filter((r) => r.marketCap !== null).length, "with a market cap")}
        {tile(listed.filter((r) => r.website).length, "with a website (not yet checked)")}
        {tile(delisted, "marked delisted")}
        {tile(listed.filter((r) => r.hasCard).length, "with a TapCard card")}
      </section>

      {loadError && <p style={{ color: "#fca5a5" }}>Couldn&apos;t load the list: {loadError}</p>}

      {rows.length === 0 && !loadError && (
        <section style={card}>
          <h2 style={{ fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>Start the list</h2>
          <p style={{ margin: "0 0 12px" }}>The table is empty. This loads the 1,488 London-listed shares the app already knows (LSE lists of 15 December 2025), with the market caps, websites and sectors held in the old ShareQuest data. The websites are not checked yet.</p>
          <button type="button" style={primary} onClick={load} disabled={busy}>Load the starting list</button>
        </section>
      )}

      <section style={card}>
        <h2 style={{ fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>Update from the LSE stock lists</h2>
        <p style={{ margin: "0 0 12px" }}>Choose all three spreadsheets together (SETS, SETSqx CCP and SETSqx Non CCP, from the London Stock Exchange&apos;s stock lists page). You see what would change before anything does.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="file" accept=".xlsx" multiple style={field} onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setPreview(null); setMsg(""); }} aria-label="LSE stock list files" />
          <button type="button" style={btn} disabled={busy || files.length === 0} onClick={() => upload("preview")}>{busy ? "Working…" : "Show what would change"}</button>
        </div>
        {preview && d && (
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: "0 0 6px" }}>
              {preview.perFile.map((f) => `${f.name}: ${f.shares} shares${f.asOf ? ` (list dated ${f.asOf})` : ""}`).join(" · ")}. Together {d.total} share lines (other products such as ETFs and international shares are left out).
            </p>
            {!preview.complete && <p style={{ color: "#fca5a5", fontWeight: 700 }}>This looks incomplete: a full set holds about 1,500. Choose all three files.</p>}
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
              {preview.applied ? "Done: " : "Would: "}add {d.added.length}, mark {d.removed.length} as delisted, bring back {d.returned.length}, new ISIN for {d.isinChanged.length}, update {d.changed.length}; {d.unchanged} unchanged.
            </p>
            {list("New on the list", d.added.map((a) => `${a.name} (${a.ticker}, ${a.market}, ${a.isin})`), true)}
            {list("No longer on the list (would be marked delisted)", d.removed.map((r) => `${r.name} (${r.ticker}, ${r.isin})${r.hasCard ? " — has a TapCard card" : ""}`), true)}
            {list("Same company, new ISIN (updated in place, nothing lost)", d.isinChanged.map((c) => `${c.name} (${c.ticker}): ${c.oldIsin} → ${c.newIsin}`))}
            {list("Back on the list", d.returned.map((r) => `${r.name} (${r.isin})`))}
            {list("Ticker or market changed", d.changed.map((c) => `${c.name}: ${c.changes.join(", ")}`))}
            {preview.applied && preview.deleted !== undefined && (preview.deleted > 0 || preview.kept) ? <p style={{ margin: "6px 0", fontWeight: 700 }}>Deleted {preview.deleted} no longer listed{preview.kept ? `; kept ${preview.kept} that have a TapCard card (marked delisted)` : ""}.</p> : null}
            {!preview.applied && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", marginBottom: 8 }}><input type="checkbox" checked={alsoDelete} onChange={(e) => setAlsoDelete(e.target.checked)} /> Also delete the {d.removed.length} that are no longer listed (a company with a TapCard card is kept and marked delisted)</label>
                <button type="button" style={primary} disabled={busy || !preview.complete} onClick={() => upload("apply")}>Apply these changes</button>
              </div>
            )}
          </div>
        )}
        {msg && <p style={{ marginTop: 10, fontWeight: 700 }}>{msg}</p>}
      </section>

      <section style={card}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <input style={{ ...field, minWidth: 220 }} placeholder="Search name, ticker, ISIN or sector" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label="Search" />
          <select style={field} value={market} onChange={(e) => { setMarket(e.target.value); setPage(0); }} aria-label="Market">
            <option value="all">Main and AIM</option><option value="Main">Main Market</option><option value="AIM">AIM</option>
          </select>
          <select style={field} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} aria-label="Status">
            <option value="listed">Listed</option><option value="delisted">Delisted</option><option value="all">Both</option>
          </select>
          <select style={field} value={cap} onChange={(e) => { setCap(e.target.value); setPage(0); }} aria-label="Market cap">
            <option value="all">Any market cap</option><option value="100m">£100m or more</option><option value="10m">£10m or more</option><option value="yes">Has a market cap</option><option value="no">No market cap</option>
          </select>
          <select style={field} value={web} onChange={(e) => { setWeb(e.target.value); setPage(0); }} aria-label="Website">
            <option value="all">Any website</option><option value="yes">Has a website</option><option value="no">No website</option>
          </select>
          <select style={field} value={sortBy} onChange={(e) => setSortBy(e.target.value as "cap" | "name" | "ticker")} aria-label="Sort by">
            <option value="cap">Biggest first</option><option value="name">Name A to Z</option><option value="ticker">Ticker A to Z</option>
          </select>
          <button type="button" style={btn} onClick={exportCsv} disabled={shown.length === 0}>Download CSV</button>
          {delisted > 0 && <button type="button" style={btn} onClick={removeDelisted} disabled={busy}>Remove delisted ({delisted})</button>}
        </div>
        <p style={{ margin: "0 0 8px" }}>{shown.length} companies{shown.length > PAGE ? `, showing ${page * PAGE + 1} to ${Math.min(shown.length, page * PAGE + PAGE)}` : ""}.</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,.35)" }}>
                {["Company", "Ticker", "Market", "Sector", "Market cap", "Website", ""].map((h) => <th key={h} style={{ padding: "6px 8px" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.isin} style={{ borderBottom: "1px solid rgba(255,255,255,.14)", verticalAlign: "top" }}>
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ fontWeight: 700 }}>{r.name}{r.status === "delisted" && <span style={{ marginLeft: 6, color: "#fca5a5" }}>delisted</span>}{r.hasCard && <span style={{ marginLeft: 6, color: "#86efac" }}>TapCard</span>}</div>
                    <div style={{ fontSize: 12 }}>{r.isin} · {r.country}</div>
                  </td>
                  <td style={{ padding: "6px 8px" }}>{r.ticker}</td>
                  <td style={{ padding: "6px 8px" }}>{r.market}</td>
                  <td style={{ padding: "6px 8px" }}>{r.sector}</td>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{money(r.marketCap)}{r.marketCapAt && <div style={{ fontSize: 12 }}>as of {r.marketCapAt}</div>}</td>
                  <td style={{ padding: "6px 8px", wordBreak: "break-all" }}>
                    {r.website ? <a href={r.website} target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd" }}>{r.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : ""}
                    {r.website && <div style={{ fontSize: 12 }}>{r.websiteSource}</div>}
                  </td>
                  <td style={{ padding: "6px 8px" }}><button type="button" style={{ ...btn, padding: "3px 8px" }} onClick={() => editWebsite(r)}>Set website</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <button type="button" style={btn} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page + 1} of {pages}</span>
            <button type="button" style={btn} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
}
