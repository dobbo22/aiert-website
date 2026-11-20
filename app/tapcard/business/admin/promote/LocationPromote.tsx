"use client";

import { useState } from "react";

interface Props { cardId: string; offers?: { id: number; text: string; audience: string[] }[]; hasNews: boolean; groups?: { slug: string; label: string; members: number; reachable: number }[] }

// Switched on once the TapCard apps show stamp cards and take over a web claim (iPhone 3.2 / Android 1.7). Until then a customer who
// installed the app would find nothing, so owners are not offered "needs the app".
const APP_GATE_READY = true;

// Post or withdraw one location's offer and news.
export default function LocationPromote({ cardId, offers = [], hasNews, groups = [] }: Props) {
  const hasOffer = offers.length > 0;
  const [open, setOpen] = useState<"offer" | "news" | null>(null);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [days, setDays] = useState("14");
  const [limit, setLimit] = useState("");
  const [pin, setPin] = useState("");
  // A stamp card the owner configures: N stamps, then a reward in their own words.
  const [kind, setKind] = useState<"once" | "stamps">("once");
  const [stamps, setStamps] = useState("5");
  const [reward, setReward] = useState("");
  const [gap, setGap] = useState("4");
  const [needApp, setNeedApp] = useState(false);
  // Who gets the news notification: everyone who follows, or only the chosen groups (a lounge, say).
  const [picked, setPicked] = useState<string[]>([]);
  const [offerPicked, setOfferPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/biz/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...body }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) { window.location.reload(); return; }
    setMsg(data.error ?? "Couldn't do that. Try again.");
  }

  const field = "mt-1 w-full rounded-lg bg-white px-3 py-2 text-[#111318]";
  // Who an offer or a piece of news is for: everyone who follows, or only the chosen groups (a lounge, say).
  const audience = (value: string[], set: (v: string[]) => void, name: string, title: string, note: string) => groups.length > 0 && (
    <fieldset className="mt-3">
      <legend className="font-semibold">{title}</legend>
      <label className="mt-1 flex items-center gap-2"><input type="radio" name={name} checked={value.length === 0} onChange={() => set([])} /> Everyone who follows</label>
      <label className="mt-1 flex items-center gap-2"><input type="radio" name={name} checked={value.length > 0} onChange={() => set(value.length ? value : [groups[0].slug])} /> Only chosen groups</label>
      {value.length > 0 && (
        <div className="mt-2 ml-6 grid gap-1">
          {groups.map((g) => (
            <label key={g.slug} className="flex items-center gap-2">
              <input type="checkbox" checked={value.includes(g.slug)} onChange={(e) => set(e.target.checked ? [...value, g.slug] : value.filter((x) => x !== g.slug))} />
              #{g.label} <span className="text-sm">({g.members} {g.members === 1 ? "follower" : "followers"}, {g.reachable} can be notified)</span>
            </label>
          ))}
        </div>
      )}
      <p className="mt-2 text-sm">{note}</p>
    </fieldset>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold" onClick={() => setOpen(open === "offer" ? null : "offer")}>{hasOffer ? "Post another offer" : "Post an offer"}</button>
        {offers.map((o) => {
          const labels = o.audience.map((slug) => groups.find((g) => g.slug === slug)?.label).filter(Boolean).map((l) => `#${l}`);
          const who = o.audience.length ? labels.join(" and ") || "group" : "everyone";
          return (
            <button key={o.id} type="button" disabled={busy} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm" onClick={() => send({ action: "withdrawOffer", offerId: o.id })}>
              {offers.length > 1 || o.audience.length ? `Withdraw offer for ${who}` : "Withdraw offer"}
            </button>
          );
        })}
        <button type="button" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold" onClick={() => setOpen(open === "news" ? null : "news")}>Post news</button>
        {hasNews ? <button type="button" disabled={busy} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm" onClick={() => send({ action: "withdrawNews" })}>Withdraw news</button> : null}
      </div>
      {open === "offer" && (
        <div className="mt-3 rounded-xl bg-black/20 p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setKind("once")} className={`rounded-lg px-3 py-2 font-semibold ${kind === "once" ? "bg-white text-[#111318]" : "bg-white/10"}`}>One-off offer</button>
            <button type="button" onClick={() => setKind("stamps")} className={`rounded-lg px-3 py-2 font-semibold ${kind === "stamps" ? "bg-white text-[#111318]" : "bg-white/10"}`}>Stamp card</button>
          </div>
          {kind === "stamps" && (
            <div className="mt-3 rounded-lg bg-white/5 p-3">
              <p className="text-xs text-cloud">Customers get a card on their phone. Staff scan it and enter your PIN to add a stamp. When it is full they get the reward and the card starts again.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label>Stamps needed (1 to 20)<input className={field} value={stamps} onChange={(e) => setStamps(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
                <label>Time between stamps
                  <select className={field} value={gap} onChange={(e) => setGap(e.target.value)}>
                    <option value="0">No limit</option><option value="1">1 hour</option><option value="4">4 hours</option><option value="12">12 hours</option><option value="24">24 hours</option>
                  </select>
                </label>
              </div>
              <label className="mt-2 block">The reward<input className={field} value={reward} onChange={(e) => setReward(e.target.value.slice(0, 60))} placeholder="Free child&apos;s meal" /></label>
              {APP_GATE_READY && (
                <label className="mt-3 flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={needApp} onChange={(e) => setNeedApp(e.target.checked)} />
                  <span>Customers need the TapCard app after their first stamp. <span className="text-cloud">The first stamp needs nothing to install. From the second, they need the TapCard app, and their stamps come with them.</span></span>
                </label>
              )}
            </div>
          )}
          <label className="mt-3 block">{kind === "stamps" ? "How you describe it" : "The offer"}
            <input className={field} value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder={kind === "stamps" ? `Buy ${stamps || "3"} meals, get ${reward || "a child's meal free"}` : "Free dessert with any main"} />
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label>Days it lasts<input className={field} value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} /></label>
            <label>{kind === "stamps" ? "Max cards (optional)" : "Limit (optional)"}<input className={field} value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} /></label>
            <label>Staff PIN<input className={field} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 to 6 digits" /></label>
          </div>
          {kind === "stamps" && <p className="mt-2 text-xs text-cloud">Posting a new offer for the same audience later replaces this card, and customers&apos; stamps start again.</p>}
          {audience(offerPicked, setOfferPicked, `o-${cardId}`, "Who can claim it", "Only the chosen groups are notified. Only people who joined one of them (through its QR code, in the app) can see or claim it. A card can run one offer for everyone and one for each group (or set of groups) at the same time; posting to the same audience again replaces that audience's offer.")}
          <button type="button" disabled={busy || pin.length < 4 || (kind === "stamps" ? !reward.trim() || !Number(stamps) : !text.trim())} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-[#111318] disabled:opacity-50"
            onClick={() => send({
              action: "offer", kind,
              text: text.trim() || (kind === "stamps" ? `Buy ${stamps}, get ${reward.trim()}` : ""),
              days: Number(days), maxClaims: limit ? Number(limit) : undefined, pin, groups: offerPicked,
              ...(kind === "stamps" ? { stampsRequired: Number(stamps), rewardText: reward.trim(), stampGapHours: Number(gap), requireAppAfterFirst: APP_GATE_READY && needApp } : {}),
            })}>{kind === "stamps" ? "Start the stamp card" : "Post offer"}</button>
        </div>
      )}
      {open === "news" && (
        <div className="mt-3 rounded-xl bg-black/20 p-3 text-sm">
          <label className="block">The news (one short line)<input className={field} value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder="New autumn menu from Friday" /></label>
          <label className="mt-2 block">Link to the full story (optional)<input className={field} value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder="https://yoursite.com/news/autumn-menu" inputMode="url" /></label>
          {audience(picked, setPicked, `n-${cardId}`, "Send the notification to", "The news line also shows on the card for anyone who opens it. Only the notification goes to the groups you choose.")}
          <button type="button" disabled={busy || !text.trim()} className="mt-3 rounded-lg bg-white px-4 py-2 font-semibold text-[#111318] disabled:opacity-50" onClick={() => send({ action: "news", text, link, groups: picked })}>{picked.length > 0 ? `Post news to ${picked.length === 1 ? "this group" : "these groups"}` : "Post news"}</button>
        </div>
      )}
      {msg ? <p className="mt-2 text-sm font-semibold">{msg}</p> : null}
    </div>
  );
}
