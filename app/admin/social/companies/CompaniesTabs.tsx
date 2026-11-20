"use client";

import { useEffect, useState, type ReactNode } from "react";

export interface Pane { id: string; label: string; count?: number; node: ReactNode }

/// Companies / Logs / Lookups. All three are in the page already; only the chosen one is shown. The choice is kept in the address (#logs).
export default function CompaniesTabs({ panes }: { panes: Pane[] }) {
  const [active, setActive] = useState(panes[0].id);
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (panes.some((p) => p.id === fromHash)) setActive(fromHash);
  }, [panes]);
  function pick(id: string) { setActive(id); try { window.history.replaceState(null, "", `#${id}`); } catch { /* ignore */ } }
  return (
    <div>
      <div role="tablist" aria-label="Companies sections" style={{ display: "flex", gap: 4, borderBottom: "2px solid rgba(255,255,255,.18)", marginBottom: 20, flexWrap: "wrap" }}>
        {panes.map((p) => {
          const on = p.id === active;
          return (
            <button key={p.id} type="button" role="tab" aria-selected={on} onClick={() => pick(p.id)}
              style={{ background: on ? "#f5c451" : "transparent", color: on ? "#111" : "#ffffff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: "8px 8px 0 0", padding: "10px 20px", cursor: "pointer", marginBottom: -2, borderBottom: on ? "2px solid #f5c451" : "2px solid transparent" }}>
              {p.label}{p.count !== undefined ? ` (${p.count})` : ""}
            </button>
          );
        })}
      </div>
      {panes.map((p) => <div key={p.id} role="tabpanel" hidden={p.id !== active}>{p.node}</div>)}
    </div>
  );
}
