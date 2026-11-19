"use client";

import { useState } from "react";

export interface ClientRow { orgId: string; name: string; status: string; canRegulatory: boolean }

/// The adviser's companies, and a search to ask a new one to approve the adviser.
export default function AdviserHome({ clients }: { clients: ClientRow[] }) {
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
    const res = await fetch("/api/tapcard/adviser/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { error?: string; created?: boolean };
    setBusy(false);
    if (res?.ok) { setMsg({ ok: true, text: data.created === false ? "That request is already open." : "Asked. The company's senior admins have been emailed. You get access when one approves." }); setTimeout(() => window.location.reload(), 1200); return; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }
  const status = (c: ClientRow) => c.status === "approved" ? (c.canRegulatory ? "Approved · may post regulatory news" : "Approved · general headlines") : c.status === "pending" ? "Waiting for the company to approve" : "Removed by the company";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Your companies</h2>
        {clients.length === 0 && <p className="mt-3 text-cloud">None yet. Ask a company below to approve you.</p>}
        <ul className="mt-3 divide-y divide-white/10">
          {clients.map((c) => (
            <li key={c.orgId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-semibold text-cloud">{c.name}</p><p className="text-sm text-cloud">{status(c)}</p></div>
              {c.status === "approved" && <a href={`/business/adviser/${c.orgId}`} className="btn-gold rounded-xl px-4 py-2 font-semibold">Open headlines</a>}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Ask a company to approve you</h2>
        <p className="mt-2 text-cloud">Find the company by name. Its senior admins get an email and decide. Until they approve, you can&apos;t see or do anything for it.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-cloud">Company name
            <input className="mt-1 block rounded-lg bg-white px-3 py-2 text-[#111318]" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="KEFI" />
          </label>
          <button type="button" disabled={busy || q.trim().length < 2} onClick={() => void search()} className="rounded-xl px-5 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">Search</button>
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
