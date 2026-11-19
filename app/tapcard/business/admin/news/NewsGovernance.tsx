"use client";

import { useState } from "react";

export interface DraftRow { id: number; kind: string; text: string; link: string; groups: string[]; createdBy: string; createdAt: string; websiteStatus: string }
export interface AdminRow { email: string; senior: boolean }
export interface AuditRow { id: number; at: string; action: string; kind: string; actor: string; text: string; link: string; detail: Record<string, unknown> }

const label: Record<string, string> = {
  posted: "Posted", submitted: "Written, waiting for approval", approved: "Approved", rejected: "Turned down", "draft-withdrawn": "Draft withdrawn",
  withdrawn: "Withdrawn", refused: "Refused", "approval-on": "Second approval switched on", "approval-off": "Second approval switched off",
  "senior-on": "Made senior", "senior-off": "Senior removed",
};
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/// Who may post regulatory news, the optional second approval, headlines waiting for approval, and the audit trail.
export default function NewsGovernance({ cardId, me, meSenior, approval, admins, drafts, audit }: { cardId: string; me: string; meSenior: boolean; approval: boolean; admins: AdminRow[]; drafts: DraftRow[]; audit: AuditRow[] }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(body: Record<string, unknown>, confirmMissing = false) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/biz/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...body }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { error?: string; code?: string };
    setBusy(false);
    if (res?.ok) { window.location.reload(); return; }
    if (data.code === "not_on_website" && !confirmMissing && window.confirm(`${data.error}\n\nApprove anyway? This will be recorded in the audit trail.`)) { await call({ ...body, override: true }, true); return; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }
  const siteNote = (s: string) => s === "found" ? "✓ found on your announcements page" : s === "no-feed" ? "⚠ no announcements page is being watched" : "⚠ not found on your announcements page";

  return (
    <div className="space-y-6">
      {drafts.length > 0 && (
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-gold/40">
          <h2 className="text-lg font-bold text-cloud">Waiting for approval</h2>
          <ul className="mt-3 divide-y divide-white/10">
            {drafts.map((d) => {
              const own = d.createdBy === me.toLowerCase();
              return (
                <li key={d.id} className="py-3">
                  <p className="text-cloud"><span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-black">{d.kind === "rns" ? "Regulatory" : "General"}</span> {d.text}</p>
                  <p className="mt-1 break-all text-sm text-cloud">{d.link} · {siteNote(d.websiteStatus)}</p>
                  <p className="mt-1 text-sm text-cloud">Written by {d.createdBy}, {when(d.createdAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meSenior && !own && <button type="button" disabled={busy} onClick={() => void call({ action: "approveNews", draftId: d.id })} className="btn-gold rounded-xl px-4 py-2 font-semibold disabled:opacity-60">Approve and send</button>}
                    {(meSenior || own) && <button type="button" disabled={busy} onClick={() => { const note = window.prompt(own ? "Withdraw this draft?" : "Why is it being turned down? (optional)", "") ; if (note !== null) void call({ action: "rejectNews", draftId: d.id, note }); }} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">{own ? "Withdraw" : "Turn down"}</button>}
                    {own && <span className="self-center text-sm text-cloud">A different senior admin has to approve this.</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Who can post what</h2>
        <p className="mt-2 text-cloud">General headlines (events, webcasts, meeting invitations) can be posted by any admin. <strong>Regulatory</strong> headlines can only be posted by a senior admin, need a link, and are checked against your own announcements page. Withdrawing a regulatory headline is also senior only.</p>
        <ul className="mt-3 divide-y divide-white/10">
          {admins.map((a) => (
            <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="text-cloud">{a.email} <span className="text-sm">{a.senior ? "· senior" : "· general only"}</span></span>
              {meSenior && <button type="button" disabled={busy} onClick={() => void call({ action: "setSenior", email: a.email, on: !a.senior })} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">{a.senior ? "Make general only" : "Make senior"}</button>}
            </li>
          ))}
        </ul>
        <label className="mt-4 flex items-start gap-3 text-cloud">
          <input type="checkbox" className="mt-1" checked={approval} disabled={busy || !meSenior} onChange={(e) => void call({ action: "setApproval", on: e.target.checked })} />
          <span><strong>Second approval for regulatory headlines.</strong> One admin writes it and a different senior admin approves it before anything is sent. Needs at least two senior admins.</span>
        </label>
        {!meSenior && <p className="mt-2 text-sm text-cloud">Only a senior admin can change these settings.</p>}
        {msg && <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-cloud" role="status">✗ {msg.text}</p>}
      </div>

      <details className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <summary className="cursor-pointer text-lg font-bold text-cloud">Audit trail ({audit.length} most recent)</summary>
        <p className="mt-3 text-cloud">Every post, approval, refusal and withdrawal, with who did it. Entries cannot be edited or deleted here. <a className="text-gold underline" href="/api/tapcard/biz/news-audit">Download as CSV</a></p>
        <ul className="mt-3 divide-y divide-white/10">
          {audit.map((r) => (
            <li key={r.id} className="py-2 text-sm text-cloud">
              <span className="font-semibold">{label[r.action] ?? r.action}</span> · {r.kind === "rns" ? "Regulatory" : "General"} · {r.actor} · {when(r.at)}
              {r.text && <span className="block">{r.text}</span>}
              {r.detail?.override === true && <span className="block text-gold">Posted although it was not found on the company website.</span>}
              {r.detail?.writtenBy ? <span className="block">Written by {String(r.detail.writtenBy)}</span> : null}
              {r.detail?.note ? <span className="block">Note: {String(r.detail.note)}</span> : null}
            </li>
          ))}
          {audit.length === 0 && <li className="py-2 text-sm text-cloud">Nothing yet.</li>}
        </ul>
      </details>
    </div>
  );
}
