"use client";

import { useMemo, useState } from "react";
import { filterRows, needsAttention, portfolioTotals, sortRows, type PortfolioFilter, type PortfolioRow } from "@/lib/adviserPortfolioRules";

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const pounds = (p: number) => `£${(p / 100).toFixed(p % 100 ? 2 : 0)}`;
const CHIPS: [PortfolioFilter, string][] = [["all", "All"], ["attention", "Needs attention"], ["paying", "You pay for"], ["waiting", "Waiting for the company"]];

/// All of the adviser's companies on one screen: what needs doing first, search and filters for a long list, and a way into each company.
export default function PortfolioList({ rows, senior, onStopCovering, busy }: { rows: PortfolioRow[]; senior: boolean; onStopCovering: (orgId: string, name: string) => void; busy: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PortfolioFilter>("all");
  const totals = useMemo(() => portfolioTotals(rows), [rows]);
  const shown = useMemo(() => sortRows(filterRows(rows, query, filter)), [rows, query, filter]);

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Your companies</h2>
      {rows.length === 0 ? <p className="mt-3 text-cloud">None yet. Ask a company below to approve you.</p> : (
        <>
          <p className="mt-2 text-cloud">
            {totals.companies} {totals.companies === 1 ? "company" : "companies"} · {totals.followers.toLocaleString("en-GB")} followers in total
            {totals.pending > 0 ? ` · ${totals.pending} waiting for the company` : ""}
            {totals.monthlyPence > 0 ? ` · you pay ${pounds(totals.monthlyPence)} a month plus VAT` : ""}
          </p>
          {(totals.attention > 0 || totals.waitingForYou > 0) && (
            <button type="button" onClick={() => setFilter("attention")} className="mt-3 block w-full rounded-xl bg-gold/15 px-4 py-3 text-left font-semibold text-cloud ring-1 ring-gold/50">
              {totals.waitingForYou > 0 ? `${totals.waitingForYou} ${totals.waitingForYou === 1 ? "headline is" : "headlines are"} waiting for you to approve. ` : ""}
              {totals.attention} {totals.attention === 1 ? "company needs" : "companies need"} attention. Show {totals.attention === 1 ? "it" : "them"} →
            </button>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input aria-label="Search companies" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies" className="w-56 rounded-lg bg-white px-3 py-2 text-[#111318] placeholder:text-[#4b5260]" />
            {CHIPS.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${filter === id ? "bg-gold text-black ring-gold" : "bg-white/[0.06] text-cloud ring-white/15"}`}>{label}</button>
            ))}
          </div>
          {shown.length === 0 && <p className="mt-4 text-cloud">No company matches. Clear the search or choose All.</p>}
          <ul className="mt-3 divide-y divide-white/10">
            {shown.map((r) => (
              <li key={r.orgId} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-cloud">
                    {r.name}
                    {r.waitingForYou > 0 && <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-black">{r.waitingForYou} to approve</span>}
                    {r.yourDrafts > 0 && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-cloud">{r.yourDrafts} of yours waiting</span>}
                    {r.noPage && <span className="ml-2 rounded-full bg-red-500/30 px-2 py-0.5 text-xs font-semibold text-cloud">no announcements page</span>}
                  </p>
                  {r.status === "approved" ? (
                    <p className="text-sm text-cloud">
                      {r.followers.toLocaleString("en-GB")} {r.followers === 1 ? "follower" : "followers"} · {r.lastHeadline ? `last headline ${date(r.lastHeadlineAt)}: ${r.lastHeadline.length > 60 ? r.lastHeadline.slice(0, 60) + "…" : r.lastHeadline}` : "no headline yet"} · {r.canRegulatory ? "may post regulatory news" : "general headlines"}
                    </p>
                  ) : <p className="text-sm text-cloud">{r.status === "pending" ? "Waiting for the company to approve" : "Removed by the company"}</p>}
                  {(r.coverStatus === "active" || r.coverStatus === "ending") && (
                    <p className="text-sm text-cloud">You pay for this company: {r.tierLabel}, {pounds(r.monthlyPence)} a month plus VAT · minimum term to {date(r.committedUntil)}{r.coverStatus === "ending" ? ` · ending ${date(r.coverEndsAt)}` : ""}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === "approved" && <a href={`/business/adviser/${r.orgId}${needsAttention(r) && r.waitingForYou > 0 ? "?tab=approvals" : ""}`} className="btn-gold rounded-xl px-4 py-2 font-semibold">{r.waitingForYou > 0 ? "Review" : "Open headlines"}</a>}
                  {senior && r.coverStatus === "active" && <button type="button" disabled={busy} onClick={() => onStopCovering(r.orgId, r.name)} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">Stop covering</button>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
