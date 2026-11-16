"use client";

import { useState } from "react";

/// The company's own privacy notice link: shown in the app next to the name and email a follower chooses to share with the company.
export default function PrivacyLink({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/tapcard/biz/privacy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setMsg(r.ok ? "Saved." : j.error ?? "That did not work. Please try again.");
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Your privacy notice</h2>
      <p className="mt-2 text-cloud">
        When a shareholder chooses to share their name and email, the app shows a link to your privacy notice beside the form, as well as TapCard&apos;s own. You are the
        company that decides how those details are used, so your notice should cover it.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="sr-only" htmlFor="privacy-url">Link to your privacy notice</label>
        <input id="privacy-url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} placeholder="https://www.yourcompany.com/privacy"
          className="min-w-[18rem] flex-1 rounded-xl bg-slate/40 px-4 py-2 text-cloud ring-1 ring-slate" />
        <button type="button" disabled={busy} onClick={() => void save()} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-50">Save</button>
      </div>
      {msg && <p role="status" className="mt-3 text-cloud">{msg}</p>}
    </div>
  );
}
