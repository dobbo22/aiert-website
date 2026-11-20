"use client";

import type { CSSProperties, ReactNode } from "react";

// Two clearly different things on this page:
//   Btn  = something you press: rectangular, bordered, bold, with a shadow and a pointer.
//   Chip = information only: a small flat rounded tag, no border shadow, never clickable.

export const input = { background: "#fff", color: "#111", border: "1px solid #9ca3af", borderRadius: 8, padding: "9px 12px", fontSize: 14, minWidth: 0 } as const;
export const fieldLabel = { fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 4, display: "block" } as const;

export async function call(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/admin/tapcard/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; orgId?: string };
    return { ok: res.ok, data: res.ok || data.error ? data : { ...data, error: `The server answered ${res.status}. Sign in to the admin again, then retry.` } };
  } catch {
    return { ok: false, data: { error: "Couldn't reach the server. Check your connection and retry." } as { error?: string; url?: string; orgId?: string } };
  }
}

type Tone = "primary" | "secondary" | "danger";
const TONES: Record<Tone, CSSProperties> = {
  primary: { background: "#f5c451", color: "#111", border: "2px solid #f5c451" },
  secondary: { background: "#1e293b", color: "#ffffff", border: "2px solid #cbd5e1" },
  danger: { background: "#1e293b", color: "#fecaca", border: "2px solid #f87171" },
};

// Not available right now: still fully readable (no fading), but flat with a dashed edge.
const DISABLED: CSSProperties = { background: "#334155", color: "#e2e8f0", border: "2px dashed #94a3b8" };

/// A button. Square-cornered with a visible edge and a shadow, so it never reads as a status tag.
export function Btn({ children, onClick, disabled, tone = "secondary", small, title, ariaExpanded }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: Tone; small?: boolean; title?: string; ariaExpanded?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-expanded={ariaExpanded}
      style={{ ...(disabled ? DISABLED : TONES[tone]), borderRadius: 6, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 2px 0 rgba(0,0,0,.45)",
        padding: small ? "4px 12px" : "8px 16px", fontSize: small ? 13 : 14, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

const CHIPS: Record<string, { bg: string; fg: string; dot: string }> = {
  amber: { bg: "rgba(251,191,36,.16)", fg: "#fde68a", dot: "#fbbf24" },
  teal: { bg: "rgba(94,234,212,.14)", fg: "#99f6e4", dot: "#5eead4" },
  grey: { bg: "rgba(226,232,240,.14)", fg: "#e2e8f0", dot: "#94a3b8" },
  green: { bg: "rgba(134,239,172,.14)", fg: "#bbf7d0", dot: "#4ade80" },
  red: { bg: "rgba(252,165,165,.14)", fg: "#fecaca", dot: "#f87171" },
};

/// A status tag: information, not a control.
export function Chip({ children, tone = "grey" }: { children: ReactNode; tone?: keyof typeof CHIPS }) {
  const c = CHIPS[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: c.bg, color: c.fg, fontWeight: 600, fontSize: 12, borderRadius: 999, padding: "3px 10px 3px 8px", cursor: "default", userSelect: "none", whiteSpace: "nowrap" }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: c.dot, display: "inline-block" }} />
      {children}
    </span>
  );
}
