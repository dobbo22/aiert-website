"use client";

import { useMemo, useState } from "react";
import type { SharedFollower } from "@/lib/tapcardShare";
import { companyNameFromDomain, emailGroup } from "@/lib/tapcardShareRules";

const PRIVATE = "__private";

/// A company's logo from its website, or its first letter when there is none (the picture can fail before this page is interactive, so it is checked once it is).
function LogoTile({ domain, name }: { domain: string; name: string }) {
  const [ok, setOk] = useState(true);
  const check = (i: HTMLImageElement | null) => { if (i && i.complete && i.naturalWidth === 0) setOk(false); };
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl font-black text-cloud" aria-hidden="true">
      {name.charAt(0).toUpperCase()}
      {ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={check} src={`/api/logo?domain=${encodeURIComponent(domain)}`} alt="" className="absolute inset-0 h-12 w-12 rounded-xl bg-white object-contain p-1" onError={() => setOk(false)} />
      )}
    </span>
  );
}

/// Shareholders who chose to share their details. Filter by company (the email's domain), by private (retail) investors, by event, or search.
export default function FollowersView({ rows, following = 0 }: { rows: SharedFollower[]; following?: number }) {
  const [group, setGroup] = useState("");
  const [event, setEvent] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"company" | "everyone">("company");
  const [open, setOpen] = useState<Set<string>>(new Set());

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
  const sel = "rounded-xl bg-white px-3 py-2 text-black ring-1 ring-slate placeholder:text-[#4b5260]";
  // The By company view: the same event and search filters, grouped by the email's domain, biggest first; private addresses together at the end.
  const byCompany = useMemo(() => {
    const m = new Map<string, { r: SharedFollower; g: ReturnType<typeof emailGroup> }[]>();
    for (const x of withGroup) {
      if (event && !x.r.event.split(", ").includes(event)) continue;
      if (needle && !`${x.r.name} ${x.r.email}`.toLowerCase().includes(needle)) continue;
      const key = x.g.kind === "private" ? PRIVATE : x.g.domain;
      (m.get(key) ?? m.set(key, []).get(key)!).push(x);
    }
    return [...m.entries()].sort((a, b) => (a[0] === PRIVATE ? 1 : b[0] === PRIVATE ? -1 : b[1].length - a[1].length || a[0].localeCompare(b[0])));
  }, [withGroup, event, needle]);
  const toggle = (k: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Followers who shared their details</h2>
      <p className="mt-2 text-cloud">People who followed one of your investor relations cards and chose <strong>Follow and share my details</strong>. Anyone who followed without sharing is counted, never listed.</p>
      <details className="mt-2 text-sm text-cloud">
        <summary className="cursor-pointer font-semibold">More about this list</summary>
        <p className="mt-2">The <strong>Followed through</strong> column shows where the contact was made: your company card (a QR code or link), or the card of the person they followed. A <strong>phone number</strong> appears only for people who also shared their own TapCard with you; it comes with that card. <strong>Type</strong> groups people by the web address of their email: company domains, or Private for personal mail such as Gmail or Hotmail (usually retail investors).</p>
        <p className="mt-2">You decide how to use these details and you are responsible for that: they were given so you can contact the person about your news and shareholder information. Anything promotional needs the usual consent and an unsubscribe.</p>
      </details>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-cloud">Nobody has shared their details yet.{following > 0 ? ` ${following} ${following === 1 ? "person follows" : "people follow"} you without sharing.` : ""}</p>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              [String(rows.length), "Shared their details"],
              [following > 0 ? `${Math.min(100, Math.round((rows.length / following) * 100))}%` : "–", "Of your followers"],
              [String(companies.list.length), companies.list.length === 1 ? "Company" : "Companies"],
              [String(companies.priv), "Private / retail"],
            ] as const).map(([n, l]) => (
              <div key={l} className="rounded-xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
                <dd className="text-2xl font-black text-gold tabular-nums">{n}</dd>
                <dt className="text-sm text-cloud">{l}</dt>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="View">
            <span className="text-sm font-semibold text-cloud">View:</span>
            {([["company", "By company"], ["everyone", "Everyone"]] as const).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === k ? "bg-white text-black" : "text-cloud ring-1 ring-white/20 hover:bg-white/10"}`}>{t}</button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {view === "everyone" && <label className="text-sm font-semibold text-cloud">Company or type
              <select value={group} onChange={(e) => setGroup(e.target.value)} className={`${sel} mt-1 block`}>
                <option value="">All ({rows.length})</option>
                {companies.priv > 0 && <option value={PRIVATE}>Private / retail investors ({companies.priv})</option>}
                {companies.list.map(([d, n]) => <option key={d} value={d}>{d} ({n})</option>)}
              </select>
            </label>}
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
          {view === "company" ? (
            <div className="mt-4 space-y-2">
              <p className="font-semibold text-cloud">{byCompany.length} {byCompany.length === 1 ? "group" : "groups"} · {byCompany.reduce((n, [, v]) => n + v.length, 0)} {byCompany.reduce((n, [, v]) => n + v.length, 0) === 1 ? "person" : "people"}</p>
              {byCompany.length === 0 && <p className="rounded-xl bg-white/10 px-4 py-3 text-cloud">No one matches that filter.</p>}
              {byCompany.map(([key, people]) => {
                const isPrivate = key === PRIVATE;
                const name = isPrivate ? "Private / retail investors" : companyNameFromDomain(key);
                const isOpen = open.has(key);
                return (
                  <div key={key} className="overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
                    <button type="button" onClick={() => toggle(key)} aria-expanded={isOpen} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.06]">
                      {isPrivate ? (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl" aria-hidden="true">👤</span>
                      ) : (
                        <LogoTile domain={key} name={name} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-bold text-cloud">{name}</span>
                        <span className="block truncate text-sm text-cloud">{isPrivate ? "Gmail, Hotmail, Outlook and other personal addresses" : key}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-gold px-3 py-1 text-sm font-black text-black">{people.length}</span>
                      <span aria-hidden="true" className="text-cloud">{isOpen ? "▾" : "▸"}</span>
                    </button>
                    {isOpen && (
                      <div className="overflow-x-auto border-t border-white/10 px-4 py-2">
                        <table className="w-full text-left text-sm text-cloud">
                          <tbody>
                            {people.map(({ r }) => (
                              <tr key={r.cardId + r.email} className="border-b border-slate/40 last:border-0">
                                <td className="py-2 pr-4 font-semibold">{r.name}</td>
                                <td className="py-2 pr-4">{r.email}</td>
                                <td className="py-2 pr-4">{r.phone ? <a className="text-gold underline" href={`tel:${r.phone}`}>{r.phone}</a> : "–"}</td>
                                <td className="py-2 pr-4">{r.event || "–"}</td>
                                <td className="py-2">{new Date(r.consentedAt).toLocaleDateString("en-GB")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              {companies.list.length > 0 && <p className="text-xs text-cloud">Company names are worked out from the email address, and logos are read from each company&apos;s website.</p>}
            </div>
          ) : (
            <>
          <p className="mt-3 font-semibold text-cloud">{shown.length} of {rows.length} {rows.length === 1 ? "person" : "people"}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-cloud">
              <thead>
                <tr className="border-b border-slate">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
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
                    <td className="py-2 pr-4">{r.phone ? <a className="text-gold underline" href={`tel:${r.phone}`}>{r.phone}</a> : "–"}</td>
                    <td className="py-2 pr-4">{g.kind === "private" ? "Private" : g.domain}</td>
                    <td className="py-2 pr-4">{r.followedThrough}</td>
                    <td className="py-2 pr-4">{r.event || "–"}</td>
                    <td className="py-2">{new Date(r.consentedAt).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={7} className="py-4 text-cloud">No one matches that filter.</td></tr>}
              </tbody>
            </table>
          </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
