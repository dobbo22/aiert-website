"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ADVISER_TIERS } from "@/lib/tapcardAdviserPricing";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/tapcard/advisers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
}
const field = { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "inherit" } as const;
const gold = { ...field, background: "#FBBF24", color: "#111", fontWeight: 700, border: "none", cursor: "pointer" } as const;
const quiet = { ...field, cursor: "pointer" } as const;

export function CreateAdviser() {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [staff, setStaff] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    const r = await post({ action: "createAdviser", name, email, staffName: staff, senior: true });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    setName(""); setEmail(""); setStaff(""); router.refresh();
  }
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Adviser (e.g. IFC Advisory)" />
      <input style={field} value={staff} onChange={(e) => setStaff(e.target.value)} placeholder="First person's name" />
      <input style={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their work email" type="email" />
      <button type="button" style={gold} disabled={busy || name.trim().length < 2 || !email.includes("@")} onClick={go}>Set up adviser (first person is senior)</button>
      {error && <span style={{ color: "#fca5a5" }}>{error}</span>}
    </div>
  );
}

export function StaffEditor({ adviserId, users }: { adviserId: string; users: { email: string; name: string; senior: boolean }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [senior, setSenior] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function act(body: Record<string, unknown>) {
    setBusy(true); setError("");
    const r = await post({ adviserId, ...body });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    setEmail(""); setName(""); router.refresh();
  }
  return (
    <div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {users.map((u) => (
          <li key={u.email} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "3px 0" }}>
            <span>{u.name ? `${u.name} · ` : ""}{u.email}</span>
            <span style={{ opacity: 0.8, fontSize: 13 }}>{u.senior ? "senior" : "general"}</span>
            <button type="button" style={{ ...quiet, padding: "2px 8px", fontSize: 13 }} disabled={busy} onClick={() => act({ action: "addUser", email: u.email, name: u.name, senior: !u.senior })}>{u.senior ? "Make general" : "Make senior"}</button>
            <button type="button" style={{ ...quiet, padding: "2px 8px", fontSize: 13 }} disabled={busy} onClick={() => { if (window.confirm(`Remove ${u.email}? They lose access at once.`)) void act({ action: "removeUser", email: u.email }); }}>Remove</button>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input style={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" type="email" />
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={senior} onChange={(e) => setSenior(e.target.checked)} /> senior</label>
        <button type="button" style={quiet} disabled={busy || !email.includes("@")} onClick={() => act({ action: "addUser", email, name, senior })}>Add person</button>
        {error && <span style={{ color: "#fca5a5" }}>{error}</span>}
      </div>
    </div>
  );
}

export function TierSet({ linkId, tier, suggested, confirmed }: { linkId: string; tier: number | null; suggested: number | null; confirmed: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState<number>(tier ?? suggested ?? 1);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    const r = await post({ action: "setTier", linkId, tier: value });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    router.refresh();
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <select style={field} value={value} onChange={(e) => setValue(Number(e.target.value))} aria-label="Price band">
        {ADVISER_TIERS.map((t) => <option key={t.tier} value={t.tier}>{t.tier}. {t.label} · £{t.monthlyPence / 100}</option>)}
      </select>
      <button type="button" style={confirmed && value === tier ? quiet : gold} disabled={busy} onClick={go}>{confirmed && value === tier ? "Confirmed" : "Confirm band"}</button>
      {error && <span style={{ color: "#fca5a5" }}>{error}</span>}
    </span>
  );
}

export function ExtendTrial({ adviserId }: { adviserId: string }) {
  const router = useRouter();
  const [days, setDays] = useState(14); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    const r = await post({ action: "extendTrial", adviserId, days });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    router.refresh();
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <input style={{ ...field, width: 64 }} type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days to add" />
      <button type="button" style={quiet} disabled={busy} onClick={go}>Extend trial by days</button>
      {error && <span style={{ color: "#fca5a5" }}>{error}</span>}
    </span>
  );
}

export function ContractForm({ linkId, current }: { linkId: string; current: { ref: string | null; signedAt: string | null; signedBy: string | null; url: string | null } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState(current.ref ?? ""); const [signedAt, setSignedAt] = useState(current.signedAt ? current.signedAt.slice(0, 10) : "");
  const [signedBy, setSignedBy] = useState(current.signedBy ?? ""); const [url, setUrl] = useState(current.url ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    const r = await post({ action: "recordContract", linkId, ref, signedAt, signedBy, url });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    setOpen(false); router.refresh();
  }
  return (
    <div>
      <div style={{ fontSize: 14 }}>{current.ref ? <>Agreement <strong>{current.ref}</strong>{current.signedAt ? `, signed ${new Date(current.signedAt).toLocaleDateString("en-GB")}` : ""}{current.signedBy ? ` by ${current.signedBy}` : ""}</> : <span style={{ color: "#FBBF24" }}>No signed agreement recorded</span>}</div>
      <button type="button" style={{ ...quiet, padding: "2px 8px", fontSize: 13, marginTop: 4 }} onClick={() => setOpen((v) => !v)}>{open ? "Close" : current.ref ? "Update record" : "Record agreement"}</button>
      {open && (
        <div style={{ display: "grid", gap: 6, marginTop: 6, maxWidth: 320 }}>
          <input style={field} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Agreement reference" />
          <input style={field} type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} aria-label="Date signed" />
          <input style={field} value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Signed for the company by" />
          <input style={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link to the signed document (https://…)" />
          <button type="button" style={gold} disabled={busy} onClick={go}>Save to the agreement record</button>
          {error && <span style={{ color: "#fca5a5" }}>{error}</span>}
        </div>
      )}
    </div>
  );
}
