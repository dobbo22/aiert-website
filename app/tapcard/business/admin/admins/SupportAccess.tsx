"use client";

import { useState } from "react";

/// The company's own switch for AIERT support access: off by default; on for 7 days at a time, and the company can turn it off at once.
export default function SupportAccess({ until }: { until: string | null }) {
  const [current, setCurrent] = useState<string | null>(until && new Date(until).getTime() > Date.now() ? until : null);
  const [busy, setBusy] = useState(false);
  async function set(allow: boolean) {
    setBusy(true);
    const res = await fetch("/api/tapcard/biz/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ allow }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { until?: string | null } | null;
    setBusy(false);
    if (res?.ok) setCurrent(data?.until && new Date(data.until).getTime() > Date.now() ? data.until : null);
  }
  const when = current ? new Date(current).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "";
  return (
    <div className="mt-8 rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">AIERT support access</h2>
      <p className="mt-1 text-sm text-mist">
        If you want help, you can let AIERT support open this admin area for a limited time. It is off unless you turn it on. Support
        sessions last two hours, cannot change billing or admins, and every visit is logged. Turn it off at any time.
      </p>
      <p className="mt-3 text-cloud">{current ? `Allowed until ${when}.` : "Not allowed."}</p>
      <div className="mt-3 flex gap-3">
        <button type="button" disabled={busy} onClick={() => set(true)} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {current ? "Extend for 7 days" : "Allow for 7 days"}
        </button>
        {current && <button type="button" disabled={busy} onClick={() => set(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">Turn off</button>}
      </div>
    </div>
  );
}
