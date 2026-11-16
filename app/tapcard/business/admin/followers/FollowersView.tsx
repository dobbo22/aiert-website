"use client";

import { useMemo, useState } from "react";
import type { SharedFollower } from "@/lib/tapcardShare";
import { emailGroup } from "@/lib/tapcardShareRules";

const PRIVATE = "__private";

/// Shareholders who chose to share their details. Filter by company (the email's domain), by private (retail) investors, by event, or search.
export default function FollowersView({ rows }: { rows: SharedFollower[] }) {
  const [group, setGroup] = useState("");
  const [event, setEvent] = useState("");
  const [q, setQ] = useState("");

  const withGroup = useMemo(() => rows.map((r) => ({ r, g: emailGroup(r.email) })), [rows]);
  const companies = useMemo(() => {
    const m = new Map<string, number>();
    let priv = 0;
    for (const { g } of withGroup) {
      if (g.kind === "private") priv += 1;
      else m.set(g.domain, (m.get(g.domain) ?? 0) + 1);
    }
    return { priv, list: [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
  }, [withGroup]);
  const eventNames = useMemo(() => [...new Set(rows.flatMap((r) => (r.event ? r.event.split(", ") : [])))].sort(), [rows]);

  const needle = q.trim().toLowerCase();
  const shown = withGroup.filter(({ r, g }) => {
    if (group === PRIVATE && g.kind !== "private") return false;
    if (group && group !== PRIVATE && !(g.kind === "company" && g.domain === group)) return false;
    if (event && !r.event.split(", ").includes(event)) return false;
    if (needle && !`${r.name} ${r.email}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  const sel = "rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate";

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Followers who shared their details</h2>
      <p className="mt-2 text-cloud">People who followed one of your investor relations cards and chose <strong>Follow and share my details</strong>. Anyone who followed without sharing is counted, never listed.</p>
      <details className="mt-2 text-sm text-cloud">
        <summary className="cursor-pointer font-semibold">More about this list</summary>
        <p className="mt-2">The <strong>Followed through</strong> column shows where the contact was made: your company card (a QR code or link), or the card of the person they followed. <strong>Type</strong> groups people by the web address of their email: company domains, or Private for personal mail such as Gmail or Hotmail (usually retail investors).</p>
        <p className="mt-2">You decide how to use these details and you are responsible for that: they were given so you can contact the person about your news and shareholder information. Anything promotional needs the usual consent and an unsubscribe.</p>
      </details>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nobody has shared their details yet.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold text-cloud">Company or type
              <select value={group} onChange={(e) => setGroup(e.target.value)} className={`${sel} mt-1 block`}>
                <option value="">All ({rows.length})</option>
                {companies.priv > 0 && <option value={PRIVATE}>Private / retail investors ({companies.priv})</option>}
                {companies.list.map(([d, n]) => <option key={d} value={d}>{d} ({n})</option>)}
              </select>
            </label>
            {eventNames.length > 0 && (
              <label className="text-sm font-semibold text-cloud">Event
                <select value={event} onChange={(e) => setEvent(e.target.value)} className={`${sel} mt-1 block`}>
                  <option value="">Any event</option>
                  {eventNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm font-semibold text-cloud">Search
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className={`${sel} mt-1 block`} />
            </label>
            <a className="btn-gold ml-auto rounded-xl px-4 py-2 font-semibold" href="/api/tapcard/biz/followers">Download CSV</a>
          </div>
          <p className="mt-3 font-semibold text-cloud">{shown.length} of {rows.length} {rows.length === 1 ? "person" : "people"}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-cloud">
              <thead>
                <tr className="border-b border-slate">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Followed through</th>
                  <th className="py-2 pr-4">Events</th>
                  <th className="py-2">Shared on</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ r, g }) => (
                  <tr key={r.cardId + r.email} className="border-b border-slate/50">
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4">{r.email}</td>
                    <td className="py-2 pr-4">{g.kind === "private" ? "Private" : g.domain}</td>
                    <td className="py-2 pr-4">{r.followedThrough}</td>
                    <td className="py-2 pr-4">{r.event || "–"}</td>
                    <td className="py-2">{new Date(r.consentedAt).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={6} className="py-4 text-cloud">No one matches that filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
