"use client";

import { useState } from "react";

const MAX = 140;

export interface FeedRow { url: string; title: string; date: string | null; status: "new" | "earlier" | "ignored"; posted: boolean }
export interface FeedProps { pageUrl: string | null; suggested: string; lastError: string; rows: FeedRow[] }

const headlineOf = (title: string) => { const x = title.replace(/\s+/g, " ").trim(); return x.length <= MAX ? x : x.slice(0, MAX - 3).trimEnd() + "..."; };

export default function PostHeadline({ cardId, cardName, active, latest, followers, feed }: { cardId: string; cardName: string; active: boolean; latest: string | null; followers: number; feed: FeedProps }) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [page, setPage] = useState(feed.pageUrl ?? feed.suggested);
  const [editingPage, setEditingPage] = useState(!feed.pageUrl);
  const [feedMsg, setFeedMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function feedCall(body: Record<string, unknown>, done?: string) {
    setBusy(true); setFeedMsg(null);
    const res = await fetch("/api/tapcard/biz/ir-feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...body }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) { if (done) setFeedMsg({ ok: true, text: done.replace("{n}", String(data.found ?? ""))}); window.location.reload(); return; }
    setFeedMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }
  const fillHeadline = (r: FeedRow) => { setText(headlineOf(r.title)); setLink(r.url); window.scrollTo({ top: 0, behavior: "smooth" }); };

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

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">On your website</h2>
        <p className="mt-2 text-cloud">We read your own announcements page and list what is on it, so each new announcement is one tap away. We never read Investegate or the London Stock Exchange.</p>
        {editingPage ? (
          <div className="mt-4">
            <label className="block text-cloud">Your announcements page
              <input className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318]" value={page} onChange={(e) => setPage(e.target.value)} placeholder="https://www.example.com/news/announcements" inputMode="url" />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" disabled={busy || page.trim().length < 8} onClick={() => feedCall({ action: "save", pageUrl: page.trim() }, "Watching your page: {n} announcements found.")} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-50">{busy ? "Working…" : feed.pageUrl ? "Save this page" : "Start watching this page"}</button>
              {feed.pageUrl && <button type="button" onClick={() => { setEditingPage(false); setPage(feed.pageUrl ?? ""); }} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate">Cancel</button>}
            </div>
            <p className="mt-2 text-sm text-cloud">What is on the page now is marked Earlier. Only announcements that appear after this are marked New.</p>
          </div>
        ) : (
          <p className="mt-3 text-cloud">Watching <a className="text-gold underline" href={feed.pageUrl ?? "#"} target="_blank" rel="noopener noreferrer">{feed.pageUrl}</a> · <button type="button" className="text-gold underline" onClick={() => setEditingPage(true)}>Change page</button></p>
        )}
        {feedMsg && <p className={`mt-3 rounded-lg px-3 py-2 ${feedMsg.ok ? "bg-teal/20" : "bg-red-500/20"} text-cloud`} role="status">{feedMsg.ok ? "✓ " : "✗ "}{feedMsg.text}</p>}
        {feed.lastError && <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-cloud">The last check failed: {feed.lastError}</p>}
        {feed.pageUrl && feed.rows.length === 0 && !feed.lastError && <p className="mt-3 text-cloud">Nothing found on that page yet.</p>}
        {feed.rows.length > 0 && (
          <ul className="mt-4 divide-y divide-white/10">
            {feed.rows.map((r) => (
              <li key={r.url} className={`flex flex-wrap items-center justify-between gap-3 py-3`}>
                <div className="min-w-0 flex-1">
                  <p className="text-cloud">{r.title}</p>
                  <p className="mt-1 text-sm text-cloud">
                    {r.date ? new Date(r.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }) : "No date"} ·{" "}
                    <a className="text-gold underline" href={r.url} target="_blank" rel="noopener noreferrer">Open</a>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.posted ? <span className="rounded-full bg-teal px-3 py-1 text-sm font-bold text-black">✓ Posted</span>
                    : r.status === "new" ? <span className="rounded-full bg-gold px-3 py-1 text-sm font-bold text-black">New</span>
                    : r.status === "ignored" ? <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-cloud">Ignored</span>
                    : <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-cloud">Earlier</span>}
                  {!r.posted && r.status !== "ignored" && <button type="button" onClick={() => fillHeadline(r)} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-slate hover:text-gold">Use as headline</button>}
                  {!r.posted && (r.status === "ignored"
                    ? <button type="button" disabled={busy} onClick={() => feedCall({ action: "restore", url: r.url })} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-slate">Restore</button>
                    : <button type="button" disabled={busy} onClick={() => feedCall({ action: "ignore", url: r.url })} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-slate">Ignore</button>)}
                </div>
              </li>
            ))}
          </ul>
        )}
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
