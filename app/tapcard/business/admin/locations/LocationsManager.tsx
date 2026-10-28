"use client";

import { useState } from "react";
import LinkQr from "../LinkQr";
import { enrichPlace, searchPlaces } from "../placeClient";

interface Loc { id: string; name: string; address: string; phone: string; claimed: boolean }
interface Hit { id: string; name: string; address: string; website: string; phone: string; type: string; hours: string }

/// Build each shop's card on the web, as the apps do: find the business, tap it, and its address, phone, opening hours and booking,
/// menu and review links are filled in from Google and its website. Then create a link for the manager, who taps it in the TapCard app
/// and gets the finished card.
export default function LocationsManager({ initial, allowed, orgName }: { initial: Loc[]; allowed: number; orgName: string }) {
  const [locations, setLocations] = useState<Loc[]>(initial);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [people, setPeople] = useState<Record<string, { name: string; email: string }>>({});
  const [links, setLinks] = useState<Record<string, string>>({});

  async function search() {
    if (query.trim().length < 3) return;
    setBusy(true); setNote(null); setHits([]);
    const list = (await searchPlaces(query.trim())) as Hit[];
    setBusy(false);
    setHits(list);
    if (!list.length) setNote("No business found. Try the name with the town.");
  }

  async function add(picked: Hit) {
    setBusy(true); setNote("Reading the details from Google and the website…"); setHits([]);
    const h = (await enrichPlace(picked)) as Hit;
    const res = await fetch("/api/tapcard/biz/locations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hit: h }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; location?: Loc } | null;
    setBusy(false);
    if (res?.ok && data?.location) { setLocations((l) => [...l, data.location!]); setNote(`Added ${data.location.name}. Now create a link for its manager.`); setQuery(""); }
    else setNote(data?.error ?? "Couldn't add that location. Try again.");
  }

  async function invite(l: Loc) {
    const p = people[l.id] ?? { name: "", email: "" };
    setBusy(true); setNote(null);
    const res = await fetch("/api/tapcard/biz/locations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ invite: { locationId: l.id, name: p.name, email: p.email } }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; link?: string } | null;
    setBusy(false);
    if (res?.ok && data?.link) setLinks((m) => ({ ...m, [l.id]: data.link! }));
    else setNote(data?.error ?? "Couldn't create the link. Try again.");
  }

  async function emailAll() {
    setBusy(true); setNote(null);
    const res = await fetch("/api/tapcard/biz/locations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ emailLinks: true }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; sent?: number; to?: string } | null;
    setBusy(false);
    setNote(res?.ok ? `Sent ${data?.sent} shop card link${data?.sent === 1 ? "" : "s"} to ${data?.to}. Forward each to its manager, or open it on a phone.` : data?.error ?? "Couldn't send. Try again.");
  }

  async function remove(l: Loc) {
    if (!window.confirm(`Remove ${l.name}? You can add it again.`)) return;
    const res = await fetch(`/api/tapcard/biz/locations?id=${encodeURIComponent(l.id)}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setLocations((x) => x.filter((y) => y.id !== l.id));
  }

  function mailto(l: Loc, link: string) {
    const to = people[l.id]?.email ?? "";
    const first = (people[l.id]?.name ?? "").trim().split(/\s+/)[0];
    const subject = `Your TapCard for ${l.name}`;
    const body = `${first ? `Hi ${first},` : "Hello,"}\n\nWe use TapCard for ${orgName}. Your card for ${l.name} is ready, with the address, phone number, opening hours and links already filled in.\n\n1. Install the free TapCard app (search "TapCard" in the App Store or Google Play).\n2. Open this link on your phone: ${link}\n\nYour card appears in the app and you can share it straight away. The link works once and lasts 30 days.\n\nThanks`;
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const [candidates, setCandidates] = useState<(Hit & { source: string })[] | null>(null);

  async function discover() {
    setBusy(true); setNote("Looking for your other shops on Google and your website…");
    const res = await fetch("/api/tapcard/biz/locations/discover", { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { candidates?: (Hit & { source: string })[]; error?: string } | null;
    setBusy(false);
    if (!res?.ok) { setNote(data?.error ?? "Couldn't look just now. Try again."); return; }
    setCandidates(data?.candidates ?? []);
    setNote((data?.candidates ?? []).length ? null : "No other shops found. Add them by name and town above.");
  }

  async function addCandidate(picked: Hit & { source: string }) {
    setBusy(true);
    const c = { ...(await enrichPlace({ ...picked, type: picked.type ?? "" })), source: picked.source } as Hit & { source: string };
    const res = await fetch("/api/tapcard/biz/locations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hit: c }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; location?: Loc } | null;
    setBusy(false);
    if (res?.ok && data?.location) { setLocations((l) => [...l, data.location!]); setCandidates((x) => (x ?? []).filter((y) => y.id !== c.id)); setNote(`Added ${data.location.name}.`); }
    else setNote(data?.error ?? "Couldn't add that one.");
  }

  const full = locations.length >= allowed;
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Add a location</h2>
        <p className="mt-1 text-sm text-mist">
          Find the shop the way the TapCard app does: type its name and town, tap it, and its address, phone number, opening hours and
          booking, menu and review links are filled in from Google and its website. Your plan has {allowed} location{allowed === 1 ? "" : "s"}
          ({locations.length} added).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} disabled={full}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}
            placeholder={`${orgName || "Your business"} and the shop's town`}
            className="min-w-0 flex-1 rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate disabled:opacity-50" />
          <button type="button" onClick={() => void search()} disabled={busy || full || query.trim().length < 3}
            className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Working…" : "Find shop"}</button>
        </div>
        {hits.length > 0 && (
          <ul className="mt-3 space-y-2">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => void add(h)} className="w-full rounded-xl bg-slate/40 px-4 py-3 text-left text-cloud ring-1 ring-slate hover:ring-gold">
                  <span className="font-semibold">{h.name}</span>
                  <span className="block text-sm text-mist">{[h.type, h.address].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!full && (
          <button type="button" onClick={() => void discover()} disabled={busy} className="mt-4 text-sm font-semibold text-gold underline disabled:opacity-60">
            Find my other shops automatically
          </button>
        )}
        {candidates && candidates.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-mist">Found for {orgName}. Tap one to add it:</p>
            <ul className="mt-2 space-y-2">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => void addCandidate(c)} disabled={busy || locations.length >= allowed}
                    className="w-full rounded-xl bg-slate/40 px-4 py-3 text-left text-cloud ring-1 ring-slate hover:ring-gold disabled:opacity-60">
                    <span className="font-semibold">{c.name}</span>
                    <span className="block text-sm text-mist">{[c.address, c.phone, `from ${c.source}`].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {full && <p className="mt-3 text-sm text-gold">All {allowed} locations are set up. To add more, change the number of locations on the Billing tab.</p>}
        {note && <p className="mt-3 text-sm text-gold">{note}</p>}
      </div>

      {locations.some((l) => !l.claimed) && (
        <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <p className="text-sm text-mist">Want every waiting shop&apos;s card link in one email to yourself? Open them on a phone, or forward each to its manager.</p>
          <button type="button" onClick={() => void emailAll()} disabled={busy} className="btn-gold mt-3 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">Email me the shop card links</button>
        </div>
      )}

      {locations.map((l) => (
        <div key={l.id} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-cloud">{l.name}</h3>
              <p className="text-sm text-mist">{[l.address, l.phone].filter(Boolean).join(" · ")}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${l.claimed ? "bg-teal/20 text-teal" : "bg-gold/20 text-gold"}`}>{l.claimed ? "Card made" : "Waiting for its manager"}</span>
          </div>
          {(
            <div className="mt-4">
              {l.claimed && <p className="mb-3 text-sm text-cloud">Made the card yourself? Hand it to this shop's manager: they open the link in the TapCard app and take over the same card, with its QR code, followers and offers. You lose edit access on your phone.</p>}
              <div className="flex flex-wrap gap-3">
                <input placeholder="Manager's name" value={people[l.id]?.name ?? ""} onChange={(e) => setPeople((m) => ({ ...m, [l.id]: { name: e.target.value, email: m[l.id]?.email ?? "" } }))}
                  className="min-w-0 flex-1 rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
                <input placeholder="Manager's email" value={people[l.id]?.email ?? ""} onChange={(e) => setPeople((m) => ({ ...m, [l.id]: { name: m[l.id]?.name ?? "", email: e.target.value } }))}
                  className="min-w-0 flex-1 rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
                <button type="button" onClick={() => void invite(l)} disabled={busy} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">{l.claimed ? "Create hand-over link" : "Create link"}</button>
              </div>
              {links[l.id] && (
                <div className="mt-3 space-y-2 text-sm text-cloud">
                  <p className="break-all rounded-xl bg-slate/40 p-3">{links[l.id]}</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => navigator.clipboard?.writeText(links[l.id])} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate">Copy link</button>
                    <a href={mailto(l, links[l.id])} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate">Email it</a>
                  </div>
                  <LinkQr link={links[l.id]} />
                </div>
              )}
              {!l.claimed && <button type="button" onClick={() => void remove(l)} className="mt-3 text-sm text-mist underline">Remove this location</button>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
