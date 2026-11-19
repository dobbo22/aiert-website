"use client";

import { useState } from "react";

import PortfolioList from "./PortfolioList";
import type { PortfolioRow } from "@/lib/adviserPortfolioRules";

export interface BillingInfo { status: string; senior: boolean; trialDaysLeft: number | null; termsAccepted: boolean; termsVersion: string; coveredCount: number; monthly: string; hasCustomer: boolean }

/// The adviser's companies, and a search to ask a new one to approve the adviser.
export default function AdviserHome({ portfolio, billing }: { portfolio: PortfolioRow[]; billing: BillingInfo }) {
  const [capM, setCapM] = useState("");
  const [covers, setCovers] = useState(true);
  const [agree, setAgree] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ orgId: string; name: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function search() {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/tapcard/adviser/search?q=${encodeURIComponent(q)}`).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { companies?: { orgId: string; name: string }[] };
    setBusy(false);
    setFound(data.companies ?? []);
  }
  async function ask(orgId: string) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/adviser/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, covers, capM: capM ? Number(capM) : undefined }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { error?: string; created?: boolean };
    setBusy(false);
    if (res?.ok) { setMsg({ ok: true, text: data.created === false ? "That request is already open." : "Asked. The company's senior admins have been emailed. You get access when one approves." }); setTimeout(() => window.location.reload(), 1200); return; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }
  async function bill(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/adviser/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { error?: string; url?: string };
    setBusy(false);
    if (data.url) { window.location.href = data.url; return; }
    if (res?.ok) { window.location.reload(); return; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }
  async function endCover(orgId: string, name: string) {
    if (!window.confirm(`Stop covering ${name}? You still pay until its minimum term ends, then it has 30 days to take over its own billing.`)) return;
    setBusy(true);
    const res = await fetch("/api/tapcard/adviser/cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { error?: string };
    setBusy(false);
    if (res?.ok) window.location.reload(); else setMsg({ ok: false, text: data.error ?? "Couldn't do that." });
  }
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10" id="billing">
        <h2 className="text-lg font-bold text-cloud">Your plan</h2>
        {billing.status === "trial" && <p className="mt-2 text-cloud">Free trial: one company for 30 days{billing.trialDaysLeft !== null ? ` (${billing.trialDaysLeft} ${billing.trialDaysLeft === 1 ? "day" : "days"} left)` : " from the day its first company accepts your payment"}. To keep going and cover more companies, accept the terms and add a card. The first charge is on the last day of the trial.</p>}
        {billing.status === "active" && <p className="mt-2 text-cloud">Active. You are covering {billing.coveredCount} {billing.coveredCount === 1 ? "company" : "companies"}: {billing.monthly} a month plus VAT. Each company is added at a price set by its market cap and runs for a minimum of 6 months.</p>}
        {(billing.status === "past_due" || billing.status === "canceled") && <p className="mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-cloud">Your payment needs attention. Companies you cover keep working for 30 days after the last paid period so they can take over.</p>}
        {billing.senior ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {billing.status !== "active" && (
              <>
                <label className="flex items-center gap-2 text-cloud"><input type="checkbox" checked={agree || billing.termsAccepted} disabled={billing.termsAccepted} onChange={(e) => setAgree(e.target.checked)} /> I accept the <a className="text-gold underline" href="/business/adviser/terms" target="_blank" rel="noopener noreferrer">adviser terms</a> for my firm</label>
                {!billing.termsAccepted && <button type="button" disabled={busy || !agree} onClick={() => void bill("accept", { accept: true, version: billing.termsVersion })} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">Record acceptance</button>}
                <button type="button" disabled={busy || !billing.termsAccepted || billing.coveredCount === 0} onClick={() => void bill("checkout")} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-60">Add card and subscribe</button>
              </>
            )}
            {billing.hasCustomer && <button type="button" disabled={busy} onClick={() => void bill("portal")} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">Card and invoices</button>}
          </div>
        ) : <p className="mt-2 text-sm text-cloud">Only senior staff can sign up or change payment.</p>}
        {billing.status !== "active" && billing.coveredCount === 0 && <p className="mt-2 text-sm text-cloud">You can add a card once a company has accepted your payment.</p>}
      </div>
      <PortfolioList rows={portfolio} senior={billing.senior} busy={busy} onStopCovering={(orgId, name) => void endCover(orgId, name)} />
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Ask a company to approve you</h2>
        <p className="mt-2 text-cloud">Find the company by name. Its senior admins get an email and decide. Until they approve, you can&apos;t see or do anything for it.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-cloud">Company name
            <input className="mt-1 block rounded-lg bg-white px-3 py-2 text-[#111318]" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="KEFI" />
          </label>
          <button type="button" disabled={busy || q.trim().length < 2} onClick={() => void search()} className="rounded-xl px-5 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">Search</button>
        </div>
        <div className="mt-3 space-y-2">
          <label className="block text-cloud">Company&apos;s market cap, £ millions (sets the monthly price)
            <input className="mt-1 block w-40 rounded-lg bg-white px-3 py-2 text-[#111318]" inputMode="decimal" value={capM} onChange={(e) => setCapM(e.target.value)} placeholder="e.g. 45" />
          </label>
          <label className="flex items-start gap-2 text-cloud"><input type="checkbox" className="mt-1" checked={covers} onChange={(e) => setCovers(e.target.checked)} /> <span>We will pay for this company (the company is not billed, and can take over at any time)</span></label>
          <p className="text-sm text-cloud">AIERT checks the market cap and may adjust the band. Price per company per month plus VAT: under £10m £25 · £10–25m £30 · £25–50m £40 · £50–100m £50 · £100–250m £60 · £250–500m £70 · £500m–£1bn £85 · over £1bn £100.</p>
        </div>
        {found && found.length === 0 && <p className="mt-3 text-cloud">No investor-relations company found with that name. It may not be set up on TapCard yet.</p>}
        {found && found.length > 0 && (
          <ul className="mt-3 divide-y divide-white/10">
            {found.map((c) => (
              <li key={c.orgId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className="text-cloud">{c.name}</span>
                <button type="button" disabled={busy} onClick={() => void ask(c.orgId)} className="btn-gold rounded-xl px-4 py-2 font-semibold disabled:opacity-60">Ask to be approved</button>
              </li>
            ))}
          </ul>
        )}
        {msg && <p className={`mt-3 rounded-lg px-3 py-2 ${msg.ok ? "bg-teal/20" : "bg-red-500/20"} text-cloud`} role="status">{msg.ok ? "✓ " : "✗ "}{msg.text}</p>}
      </div>
    </div>
  );
}
