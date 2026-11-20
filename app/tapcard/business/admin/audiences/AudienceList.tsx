"use client";

import { useMemo, useState } from "react";
import GroupsPanel, { type GroupRow } from "../news/GroupsPanel";

export interface AudienceCard { id: string; name: string; subtitle: string; kind: "location" | "staff"; groups: GroupRow[] }

/// One collapsible section per card (a location, or a member of staff). Closed, it is a single row with the person's name and how many
/// groups and followers they have; opened, it holds that card's groups and QR codes. What you type stays when you close a section.
export default function AudienceList({ cards, captionName }: { cards: AudienceCard[]; captionName: string }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(cards.length === 1 ? [cards[0].id] : []));
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const w = q.toLowerCase().trim();
    return w ? cards.filter((c) => `${c.name} ${c.subtitle}`.toLowerCase().includes(w)) : cards;
  }, [cards, q]);
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const btn = "rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-cloud ring-1 ring-white/20 hover:bg-white/20";

  return (
    <div className="space-y-3">
      {cards.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {cards.length > 5 && (
            <input className="w-64 rounded-lg bg-white px-3 py-2 text-sm text-[#111318] placeholder:text-[#4b5260]" placeholder="Find a person or location" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a person or location" />
          )}
          <button type="button" className={btn} onClick={() => setOpen(new Set(shown.map((c) => c.id)))}>Open all</button>
          <button type="button" className={btn} onClick={() => setOpen(new Set())}>Close all</button>
          <span className="text-sm text-cloud">{shown.length} {shown.length === 1 ? "card" : "cards"}</span>
        </div>
      )}
      {shown.map((c) => {
        const isOpen = open.has(c.id);
        const followers = c.groups.reduce((n, g) => n + g.members, 0);
        return (
          <section key={c.id} className={`rounded-2xl bg-charcoal ring-1 ${isOpen ? "ring-gold/50" : "ring-white/10"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left text-cloud" aria-label={`${isOpen ? "Close" : "Open"} ${c.name}`}>
                <span aria-hidden="true" className="inline-block w-4 transition-transform" style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>▸</span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold">{c.name}</span>
                  <span className="block text-sm">{c.subtitle}{c.subtitle ? " · " : ""}{c.kind === "location" ? "Location card" : "Staff card"} · {c.groups.length} {c.groups.length === 1 ? "group" : "groups"} · {followers} {followers === 1 ? "follower" : "followers"}</span>
                </span>
              </button>
              <button type="button" className={btn} aria-expanded={isOpen} onClick={() => toggle(c.id)}>{isOpen ? "Close ▴" : "Groups ▾"}</button>
            </div>
            {/* Always in the page, only shown when open, so a half-typed group name is kept when the section is closed. */}
            <div hidden={!isOpen} className="border-t border-white/10 p-4">
              <GroupsPanel cardId={c.id} initial={c.groups} business={{ cardName: c.name, captionName, hideTitle: true }} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
