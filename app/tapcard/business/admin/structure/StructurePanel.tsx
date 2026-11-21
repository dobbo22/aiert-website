"use client";

import { useState } from "react";

interface Unit { id: string; name: string; parent_id: string | null; owner_card_id: string | null }
interface State { units: Unit[]; cards: Record<string, string>; followers: Record<string, number> }
interface CardOpt { id: string; name: string; location: boolean }

export default function StructurePanel({ initial, companyCards }: { initial: State; companyCards: CardOpt[] }) {
  const [s, setS] = useState<State>(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const nameOf = (id: string | null) => companyCards.find((c) => c.id === id)?.name ?? "";
  const locations = companyCards.filter((c) => c.location);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/tapcard/biz/units", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) setMsg(j.error || "That didn't work.");
      else { setS({ units: j.units, cards: j.cards, followers: j.followers }); return true; }
    } catch { setMsg("No connection. Try again."); } finally { setBusy(false); }
    return false;
  }

  const children = (pid: string | null) => s.units.filter((u) => u.parent_id === pid);
  const field = "rounded-lg bg-white px-2 py-1.5 text-sm text-[#111318]";
  const btn = "rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-50";

  function Node({ u, depth }: { u: Unit; depth: number }) {
    const mine = Object.entries(s.cards).filter(([, uid]) => uid === u.id).map(([cid]) => cid);
    const invalidParents = new Set<string>([u.id]);
    const grow = () => { let g = true; while (g) { g = false; for (const x of s.units) if (x.parent_id && invalidParents.has(x.parent_id) && !invalidParents.has(x.id)) { invalidParents.add(x.id); g = true; } } };
    grow();
    return (
      <div style={{ marginLeft: depth ? 16 : 0 }} className="mt-3">
        <section className="rounded-2xl bg-charcoal p-4 ring-1 ring-white/10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold text-cloud">{u.name}</h3>
            <span className="text-sm text-cloud">{s.followers[u.id] ?? 0} followers including groups below</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-cloud">Owner
              <select className={`${field} mt-1 block w-full`} value={u.owner_card_id ?? ""} disabled={busy} onChange={(e) => act({ action: "owner", id: u.id, cardId: e.target.value || null })}>
                <option value="">No owner</option>
                {companyCards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="text-sm text-cloud">Sits under
              <select className={`${field} mt-1 block w-full`} value={u.parent_id ?? ""} disabled={busy} onChange={(e) => act({ action: "move", id: u.id, parentId: e.target.value || null })}>
                <option value="">Top level</option>
                {s.units.filter((x) => !invalidParents.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 text-sm text-cloud">
            Locations in this group: {mine.length ? mine.map((cid) => nameOf(cid)).join(", ") : "none"}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select className={field} defaultValue="" disabled={busy || !locations.length} aria-label="Add a location to this group" onChange={(e) => { if (e.target.value) { act({ action: "assign", id: u.id, cardId: e.target.value }); e.target.value = ""; } }}>
                <option value="">Add a location…</option>
                {locations.filter((c) => s.cards[c.id] !== u.id).map((c) => <option key={c.id} value={c.id}>{c.name}{s.cards[c.id] ? " (move here)" : ""}</option>)}
              </select>
              {mine.map((cid) => <button key={cid} type="button" className={btn} disabled={busy} onClick={() => act({ action: "assign", id: null, cardId: cid })}>Remove {nameOf(cid)}</button>)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={busy} onClick={() => { const n = window.prompt("New name for this group", u.name); if (n) act({ action: "rename", id: u.id, name: n }); }}>Rename</button>
            <button type="button" className={btn} disabled={busy} onClick={() => { const n = window.prompt(`Name of a new group under ${u.name}`); if (n) act({ action: "create", name: n, parentId: u.id }); }}>Add a group under this</button>
            <button type="button" className={btn} disabled={busy} onClick={() => { if (window.confirm(`Remove ${u.name}? Its owner loses the rights it gave.`)) act({ action: "delete", id: u.id }); }}>Remove</button>
          </div>
        </section>
        {children(u.id).map((c) => <Node key={c.id} u={c} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div>
      {s.units.length === 0 && <p className="rounded-2xl bg-charcoal p-6 text-cloud ring-1 ring-white/10">No groups yet. Start with the top one, for example “Senior management”.</p>}
      {children(null).map((u) => <Node key={u.id} u={u} depth={0} />)}
      <form className="mt-6 flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); if (await act({ action: "create", name: newName, parentId: null })) setNewName(""); }}>
        <input className={`${field} w-64`} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New top-level group" aria-label="New top-level group name" />
        <button type="submit" className={btn} disabled={busy || !newName.trim()}>Add top-level group</button>
      </form>
      {msg && <p role="alert" className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-cloud">{msg}</p>}
    </div>
  );
}
