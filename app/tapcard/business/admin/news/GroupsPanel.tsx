"use client";

import { useState } from "react";
import LinkQr from "../LinkQr";

export interface GroupRow { slug: string; label: string; members: number; reachable: number }

/// The audiences of a company card (#Kefi, #IPO Clients): add, remove, and a link + QR code for each. Someone who follows through a
/// group's link is put in that group, and a headline can then be sent to chosen groups only.
export default function GroupsPanel({ cardId, initial }: { cardId: string; initial: GroupRow[] }) {
  const [groups, setGroups] = useState<GroupRow[]>(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/tapcard/biz/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId, ...body }) }).catch(() => null);
    const data = (res ? await res.json().catch(() => ({})) : {}) as { groups?: GroupRow[]; error?: string };
    setBusy(false);
    if (res?.ok && data.groups) { setGroups(data.groups); setMsg({ ok: true, text: done }); setName(""); return; }
    setMsg({ ok: false, text: data.error ?? "Couldn't do that. Try again." });
  }
  const link = (slug: string) => `https://tapcard.aiert.co.uk/c/${cardId}?g=${encodeURIComponent(slug)}`;

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10" id="groups">
      <h2 className="text-lg font-bold text-cloud">Groups</h2>
      <p className="mt-2 text-cloud">Give each audience its own group, for example #Kefi or #IPO Clients. Each group has its own link and QR code. Someone who follows through it is put in that group, and you can send a headline to chosen groups only. Followers are not asked for a name or email; a group is only a label.</p>
      {groups.length > 0 && (
        <ul className="mt-4 divide-y divide-white/10">
          {groups.map((g) => (
            <li key={g.slug} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-cloud">#{g.label}</p>
                  <p className="text-sm text-cloud">{g.members} {g.members === 1 ? "follower" : "followers"} · {g.reachable} can be notified</p>
                </div>
                <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Remove #${g.label}? Its followers keep following; only the group goes.`)) void call({ action: "removeGroup", slug: g.slug }, "Group removed."); }} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">Remove</button>
              </div>
              <p className="mt-2 break-all text-sm text-cloud">{link(g.slug)}</p>
              <div className="mt-2 flex flex-wrap items-start gap-3">
                <button type="button" onClick={() => void navigator.clipboard?.writeText(link(g.slug))} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate">Copy link</button>
                <LinkQr link={link(g.slug)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-cloud">New group
          <input className="mt-1 block rounded-lg bg-white px-3 py-2 text-[#111318] placeholder:text-[#4b5260]" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="#Kefi" />
        </label>
        <button type="button" disabled={busy || name.replace(/#/g, "").trim().length < 1} onClick={() => void call({ action: "addGroup", name }, "Group added.")} className="btn-gold rounded-xl px-5 py-2 font-semibold disabled:opacity-50">{busy ? "Working…" : "Add group"}</button>
      </div>
      {msg && <p className={`mt-3 rounded-lg px-3 py-2 ${msg.ok ? "bg-teal/20" : "bg-red-500/20"} text-cloud`} role="status">{msg.ok ? "✓ " : "✗ "}{msg.text}</p>}
    </div>
  );
}
