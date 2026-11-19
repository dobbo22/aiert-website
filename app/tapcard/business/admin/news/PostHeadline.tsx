"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GroupsPanel, { type GroupRow } from "./GroupsPanel";

const MAX = 140;

export interface FeedRow { url: string; title: string; date: string | null; status: "new" | "earlier" | "ignored"; posted: boolean }
export interface FeedProps { pageUrl: string | null; lastCheckedAt: string | null; suggested: string; lastError: string; rows: FeedRow[] }

const headlineOf = (title: string) => { const x = title.replace(/\s+/g, " ").trim(); return x.length <= MAX ? x : x.slice(0, MAX - 3).trimEnd() + "..."; };

export default function PostHeadline({ cardId, cardName, active, latest, followers, feed, groups, meSenior, approval, adviserOrgId }: { cardId: string; cardName: string; active: boolean; latest: string | null; followers: number; feed: FeedProps; groups: GroupRow[]; meSenior: boolean; approval: boolean; adviserOrgId?: string }) {
  // An adviser works through its own route, and only reads the company's announcements page (the company controls that watch).
  const ro = !!adviserOrgId;
  const endpoint = ro ? "/api/tapcard/adviser/news" : "/api/tapcard/biz/promote";
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  // Empty = every follower; otherwise only followers in the ticked groups.
  const [audience, setAudience] = useState<string[]>([]);
  const [kind, setKind] = useState<"general" | "rns">("general");
  const picked = groups.filter((g) => audience.includes(g.slug));
  const reach = audience.length ? picked.reduce((n, g) => n + g.reachable, 0) : followers;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hasFeed = feed.rows.length > 0;
  const [composerOpen, setComposerOpen] = useState(!hasFeed);
  const [page, setPage] = useState(feed.pageUrl ?? feed.suggested);
  const [editingPage, setEditingPage] = useState(!ro && !feed.pageUrl);
  const [feedMsg, setFeedMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // When the page was last read, and a refresh that happens by itself every 3 minutes while this page stays open.
  const router = useRouter();
  const [checkedAt, setCheckedAt] = useState<string | null>(feed.lastCheckedAt);
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  async function refreshNow() {
    if (ro || !feed.pageUrl || refreshing) return;
    setRefreshing(true);
    const res = await fetch("/api/tapcard/biz/ir-feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, action: "refresh" }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { checkedAt?: string | null } | null;
    if (data?.checkedAt) setCheckedAt(data.checkedAt);
    setNow(Date.now());
    router.refresh();
    setRefreshing(false);
  }
  useEffect(() => {
    if (!feed.pageUrl) return;
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const auto = setInterval(() => { void refreshNow(); }, 180_000);
    return () => { clearInterval(tick); clearInterval(auto); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.pageUrl]);
  const ago = (iso: string | null) => {
    if (!iso) return "not yet";
    const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    const m = Math.round(s / 60);
    return m < 60 ? `${m} minute${m === 1 ? "" : "s"} ago` : `${Math.round(m / 60)} hour${Math.round(m / 60) === 1 ? "" : "s"} ago`;
  };

  async function feedCall(body: Record<string, unknown>, done?: string) {
    setBusy(true); setFeedMsg(null);
    const res = await fetch("/api/tapcard/biz/ir-feed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...body }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) { if (done) setFeedMsg({ ok: true, text: done.replace("{n}", String(data.found ?? ""))}); window.location.reload(); return; }
    setFeedMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }
  const fillHeadline = (r: FeedRow) => { setText(headlineOf(r.title)); setLink(r.url); setComposerOpen(true); setTimeout(() => document.getElementById("headline-composer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };

  async function send(body: Record<string, unknown>, done: string, override = false) {
    setBusy(true); setMsg(null);
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...(ro ? { orgId: adviserOrgId } : {}), ...body, ...(override ? { override: true } : {}) }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { error?: string; code?: string; outcome?: string };
    setBusy(false);
    if (res?.ok) {
      setMsg({ ok: true, text: data.outcome === "pending" ? "Written. It will be sent when a different senior admin approves it (see Waiting for approval below)." : done });
      setText(""); setLink(""); setAudience([]); setTimeout(() => window.location.reload(), 900); return;
    }
    // Regulatory news that is not on the company's own announcements page: a senior admin may go ahead, and it is recorded.
    if (data.code === "not_on_website" && !override && meSenior && window.confirm(`${data.error}\n\nPost it anyway? This will be recorded in the audit trail.`)) { await send(body, done, true); return; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }

  const field = "mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318] placeholder:text-[#4b5260]";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">On your website</h2>
        <p className="mt-2 text-cloud">All data is taken from your own website only.</p>
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
        ) : ro && !feed.pageUrl ? (
          <p className="mt-3 text-cloud">The company hasn&apos;t set an announcements page to watch, so regulatory headlines can&apos;t be checked against its website yet.</p>
        ) : (
          <p className="mt-3 text-cloud">Watching <a className="text-gold underline" href={feed.pageUrl ?? "#"} target="_blank" rel="noopener noreferrer">{feed.pageUrl}</a> · {!ro && <button type="button" className="text-gold underline" onClick={() => setEditingPage(true)}>Change page</button>}</p>
        )}
        {feed.pageUrl && !editingPage && (
          <p className="mt-1 text-sm text-cloud">
            Last checked {ago(checkedAt)}{!ro && <> · <button type="button" disabled={refreshing} onClick={() => void refreshNow()} className="font-semibold text-gold underline disabled:opacity-60">{refreshing ? "Checking…" : "Refresh now"}</button>
            <span className="block">It also checks by itself every few minutes while this page is open.</span></>}
          </p>
        )}
        {feedMsg && <p className={`mt-3 rounded-lg px-3 py-2 ${feedMsg.ok ? "bg-teal/20" : "bg-red-500/20"} text-cloud`} role="status">{feedMsg.ok ? "✓ " : "✗ "}{feedMsg.text}</p>}
        {feed.lastError && <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-cloud">The last check failed: {feed.lastError}</p>}
        {feed.pageUrl && feed.rows.length === 0 && !feed.lastError && <p className="mt-3 text-cloud">Nothing found on that page yet.</p>}
        {feed.rows.some((r) => r.status === "new" && !r.posted) && (
          <p className="mt-4 rounded-xl bg-gold/15 px-4 py-2 font-semibold text-cloud ring-1 ring-gold/40">{feed.rows.filter((r) => r.status === "new" && !r.posted).length} new {feed.rows.filter((r) => r.status === "new" && !r.posted).length === 1 ? "announcement" : "announcements"} since you started watching. Tap Use as headline once it is public.</p>
        )}
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
                    : <span title="Already on your page when we started watching it" className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-cloud">Earlier</span>}
                  {!r.posted && r.status !== "ignored" && <button type="button" onClick={() => fillHeadline(r)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${r.status === "new" ? "btn-gold" : "text-cloud ring-1 ring-slate hover:text-gold"}`}>Use as headline</button>}
                  {!ro && !r.posted && (r.status === "ignored"
                    ? <button type="button" disabled={busy} onClick={() => feedCall({ action: "restore", url: r.url })} className="px-1 py-1.5 text-sm text-cloud underline">Restore</button>
                    : <button type="button" disabled={busy} onClick={() => feedCall({ action: "ignore", url: r.url })} className="px-1 py-1.5 text-sm text-cloud underline">Ignore</button>)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <GroupsPanel cardId={cardId} initial={groups} adviserOrgId={adviserOrgId} />

      <details id="headline-composer" open={composerOpen} onToggle={(e) => setComposerOpen((e.currentTarget as HTMLDetailsElement).open)} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <summary className="cursor-pointer text-lg font-bold text-cloud">{hasFeed ? `Write your own headline for ${cardName}` : `Post a headline for ${cardName}`}</summary>
        <p className="mt-3 text-cloud">Never post an RNS before it is public, and say nothing that is not in it. A headline and a link to the full RNS is enough. For a meeting invitation or an event that needs no disclosure, check with your adviser first.
          {reach > 0 ? ` About ${reach} ${reach === 1 ? "follower" : "followers"} can be notified${audience.length ? " in the chosen groups" : ""}.` : " Nobody can be notified yet."}</p>
        <fieldset className="mt-4 text-cloud">
          <legend className="font-semibold">Type of headline</legend>
          <label className="mt-2 flex items-start gap-2"><input type="radio" name="kind" className="mt-1" checked={kind === "general"} onChange={() => setKind("general")} /> <span>General: an event, webcast or meeting invitation</span></label>
          <label className="mt-1 flex items-start gap-2"><input type="radio" name="kind" className="mt-1" checked={kind === "rns"} onChange={() => setKind("rns")} /> <span>Regulatory (RNS): a link is required and it is checked against your announcements page</span></label>
          {kind === "rns" && !meSenior && !approval && <p className="mt-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm">Only a senior admin can post regulatory news. Ask one to post it, or turn on second approval below so you can write it for them to approve.</p>}
          {kind === "rns" && approval && <p className="mt-2 text-sm">Second approval is on: this will wait for a different senior admin before it is sent.</p>}
        </fieldset>
        {groups.length > 0 && (
          <fieldset className="mt-4 text-cloud">
            <legend className="font-semibold">Send to</legend>
            <label className="mt-2 flex items-center gap-2"><input type="radio" name="aud" checked={audience.length === 0} onChange={() => setAudience([])} /> Everyone who follows</label>
            <label className="mt-1 flex items-center gap-2"><input type="radio" name="aud" checked={audience.length > 0} onChange={() => setAudience(audience.length ? audience : [groups[0].slug])} /> Only these groups</label>
            {audience.length > 0 && (
              <div className="ml-6 mt-1 space-y-1">
                {groups.map((g) => (
                  <label key={g.slug} className="flex items-center gap-2"><input type="checkbox" checked={audience.includes(g.slug)} onChange={(e) => setAudience(e.target.checked ? [...audience, g.slug] : audience.filter((x) => x !== g.slug))} /> #{g.label} <span className="text-sm">({g.reachable} can be notified)</span></label>
                ))}
              </div>
            )}
            {audience.length > 0 && <p className="mt-2 text-sm">Only the notification goes to the chosen groups. The headline still shows on your card for anyone who opens it.</p>}
          </fieldset>
        )}
        <label className="mt-4 block text-cloud">Headline
          <input className={field} value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} placeholder="For example: Full year results announced (RNS)" />
          <span className="mt-1 block text-sm text-cloud">{text.length} of {MAX} characters</span>
        </label>
        <label className="mt-3 block text-cloud">Link to the announcement, or to a webcast or event page
          <input className={field} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.yourcompany.com/announcements/results.pdf" inputMode="url" />
          <span className="mt-1 block text-sm text-cloud">If the page asks people to register, as many webcast platforms do, they register there. TapCard only passes on the link.</span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || !active || text.trim().length < 3 || (kind === "rns" && !link.trim())} onClick={() => send({ action: "news", kind, text: text.trim(), link: link.trim() || undefined, groups: audience.length ? audience : undefined }, audience.length ? "Posted. The chosen groups are being notified." : "Posted. Followers are being notified.")}
            className="btn-gold rounded-xl px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Working…" : kind === "rns" && approval ? "Submit for approval" : "Post to followers"}</button>
          {active && text.trim().length < 3 && <span className="text-sm text-cloud">Write a headline to post it.</span>}
          {!active && <span className="text-cloud">Billing isn&apos;t active, so posting is paused.</span>}
        </div>
        {msg && <p className={`mt-3 rounded-lg px-3 py-2 ${msg.ok ? "bg-teal/20" : "bg-red-500/20"} text-cloud`} role="status">{msg.ok ? "✓ " : "✗ "}{msg.text}</p>}
      </details>

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
