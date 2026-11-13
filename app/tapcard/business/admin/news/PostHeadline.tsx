"use client";

import { useState } from "react";

const MAX = 140;

export default function PostHeadline({ cardId, cardName, active, latest, followers }: { cardId: string; cardName: string; active: boolean; latest: string | null; followers: number }) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/biz/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...body }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) { setMsg({ ok: true, text: done }); setText(""); setLink(""); setTimeout(() => window.location.reload(), 900); return; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }

  const field = "mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318]";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Post a headline for {cardName}</h2>
        <p className="mt-2 text-cloud">Post after the announcement is public, and say nothing that is not in it. A headline and a link to the full RNS is enough.
          {followers > 0 ? ` ${followers} ${followers === 1 ? "follower" : "followers"} can be notified.` : " Nobody can be notified yet."}</p>
        <label className="mt-4 block text-cloud">Headline
          <input className={field} value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} placeholder="Conditional Approval of Development at Jibal Qutman (RNS)" />
          <span className="mt-1 block text-sm text-cloud">{text.length} of {MAX} characters</span>
        </label>
        <label className="mt-3 block text-cloud">Link to the announcement
          <input className={field} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.example.com/news/announcements" inputMode="url" />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || !active || text.trim().length < 3} onClick={() => send({ action: "news", text: text.trim(), link: link.trim() || undefined }, "Posted. Followers are being notified.")}
            className="btn-gold rounded-xl px-5 py-3 font-semibold disabled:opacity-50">{busy ? "Working…" : "Post to followers"}</button>
          {!active && <span className="text-cloud">Billing isn&apos;t active, so posting is paused.</span>}
        </div>
        {msg && <p className={`mt-3 rounded-lg px-3 py-2 ${msg.ok ? "bg-teal/20" : "bg-red-500/20"} text-cloud`} role="status">{msg.ok ? "✓ " : "✗ "}{msg.text}</p>}
      </div>

      {latest && (
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-bold text-cloud">Currently showing</h2>
          <p className="mt-2 text-cloud">{latest}</p>
          <button type="button" disabled={busy} onClick={() => send({ action: "withdrawNews" }, "Withdrawn.")} className="mt-3 rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate">Withdraw this headline</button>
        </div>
      )}
    </div>
  );
}
