"use client";

import { useState } from "react";
import type { UsageLinkRow } from "@/lib/tapcardUsage";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "never");

/// Make and revoke read-only usage links. The address of a new link is shown once; after that only when it was made and last used.
export default function UsageLinks({ initial }: { initial: UsageLinkRow[] }) {
  const [links, setLinks] = useState(initial);
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const btn = "rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50";

  async function post(body: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/biz/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { url?: string; links?: UsageLinkRow[]; error?: string };
    setBusy(false);
    if (res?.ok) { if (data.links) setLinks(data.links); return data; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
    return null;
  }

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Read-only usage links</h2>
      <p className="mt-1 text-cloud">Give someone a link to see these figures without signing in: your finance team, or AIERT for billing. It shows counts only, never names or emails. You can revoke a link at any time, and see when it was last used.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-cloud">Who is it for (optional)
          <input className="mt-1 block rounded-lg bg-white px-3 py-2 text-[#111318] placeholder:text-[#4b5260]" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder="Finance team" />
        </label>
        <button type="button" disabled={busy} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-50"
          onClick={async () => { const d = await post({ action: "create", label }); if (d?.url) { setFresh(d.url); setLabel(""); } }}>Make a link</button>
      </div>
      {fresh && (
        <div className="mt-4 rounded-xl bg-white/10 p-4 text-cloud" role="status">
          <p className="font-semibold">Copy this address now. It is shown only once.</p>
          <p className="mt-1 break-all">{fresh}</p>
          <button type="button" className={`${btn} mt-2`} onClick={() => void navigator.clipboard?.writeText(fresh)}>Copy link</button>
        </div>
      )}
      {links.length > 0 && (
        <ul className="mt-4 divide-y divide-white/10">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-cloud">
              <div>
                <p className="font-semibold">{l.label || "Usage link"}{l.revokedAt ? " (revoked)" : ""}</p>
                <p className="text-sm">Made {when(l.createdAt)} by {l.createdBy || "an admin"} · last used {when(l.lastUsedAt)}{l.revokedAt ? ` · revoked ${when(l.revokedAt)}` : ""}</p>
              </div>
              {!l.revokedAt && <button type="button" disabled={busy} className={btn} onClick={() => { if (window.confirm("Revoke this link? Anyone using it loses access at once.")) void post({ action: "revoke", id: l.id }); }}>Revoke</button>}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-cloud" role="status">✗ {msg.text}</p>}
    </div>
  );
}
