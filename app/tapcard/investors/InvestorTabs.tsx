"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// The investors page is long, so its sections sit in tabs. Every panel is still in the page's HTML (inactive ones are only hidden), so search
// engines and the FAQ structured data see all of it. The address can carry the tab (/investors#questions) and keeps in step as you switch.
export interface InvestorTab {
  id: string;
  label: string;
  node: ReactNode;
}

export default function InvestorTabs({ tabs }: { tabs: InvestorTab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (tabs.some((t) => t.id === id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  function choose(id: string) {
    setActive(id);
    try { window.history.replaceState(null, "", `#${id}`); } catch { /* the tab still switches */ }
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    choose(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div className="mt-10">
      <div role="tablist" aria-label="About TapCard for investor relations" className="flex gap-2 overflow-x-auto border-b border-white/15 pb-3">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { buttons.current[i] = el; }}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => choose(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${active === t.id ? "bg-white text-black" : "text-cloud ring-1 ring-white/20 hover:bg-white/10"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} tabIndex={0} className="pt-8">
          {t.node}
        </div>
      ))}
    </div>
  );
}
