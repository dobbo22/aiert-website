"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input = { background: "#fff", color: "#111", border: "1px solid #9ca3af", borderRadius: 8, padding: "9px 12px", fontSize: 14, minWidth: 0 } as const;
const fieldLabel = { fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4, display: "block" } as const;

async function call(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/admin/tapcard/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({})) as { error?: string; url?: string; orgId?: string };
    return { ok: res.ok, data: res.ok || data.error ? data : { ...data, error: `The server answered ${res.status}. Sign in to the admin again, then retry.` } };
  } catch {
    return { ok: false, data: { error: "Couldn't reach the server. Check your connection and retry." } as { error?: string; url?: string; orgId?: string } };
  }
}

// The gold button used across the admin.
const GOLD = "linear-gradient(90deg, #f5c451, #eaa43a)";
function Pill({ children, disabled, onClick, small }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{ background: GOLD, color: "#111", fontWeight: 700, border: "none", borderRadius: 10, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1,
        padding: small ? "3px 12px" : "9px 18px", fontSize: small ? 12 : 14, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

export function CompanyTools({ orgId, open, locations }: { orgId: string; open: boolean; locations: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; ok: boolean; link?: string } | null>(null);
  const [n, setN] = useState(String(locations));
  const [mgr, setMgr] = useState("");
  const [adm, setAdm] = useState(""), [admName, setAdmName] = useState(""), [owner, setOwner] = useState(true), [welcome, setWelcome] = useState(true);

  // Every button says what it is doing, and afterwards says what happened (or why it did not).
  async function run(label: string, body: Record<string, unknown>, done: (r: { url?: string }) => string, after?: () => void) {
    setBusy(label); setNote({ text: `${label}…`, ok: true });
    const r = await call({ ...body, orgId });
    setBusy(null);
    if (!r.ok) { setNote({ text: r.data.error ?? "That didn't work. Try again.", ok: false }); return; }
    if (r.data.url) window.open(r.data.url, "_blank", "noopener");
    setNote({ text: done(r.data), ok: true, link: r.data.url });
    after?.();
    router.refresh();
  }

  if (!open) return <p style={{ fontSize: 14 }}>The company must allow support access before you can open or change it.</p>;
  const b = (label: string) => (busy === label ? "Working…" : label);
  const group = { display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,.15)" } as const;
  const wrap = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } as const;
  const check = { fontSize: 14, display: "flex", alignItems: "center", gap: 6 } as const;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Pill disabled={!!busy} onClick={() => run("Open admin (support)", { action: "open" }, () => "Sign-in link ready (it works once and lasts 15 minutes).")}>{b("Open admin (support)")}</Pill>
      </div>
      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Change this company</summary>
        <div style={{ marginTop: 8 }}>
          <div style={group}>
            <span style={fieldLabel}>Locations</span>
            <div style={wrap}>
              <input style={{ ...input, width: 80 }} value={n} onChange={(e) => setN(e.target.value)} inputMode="numeric" aria-label="Number of locations" />
              <Pill disabled={!!busy} onClick={() => confirm(`Set this company to ${n} locations (free)? It is ${locations} now.`) && run("Set locations", { action: "free", locations: Number(n) }, () => `Done: free for ${n} locations.`)}>{b("Set locations")}</Pill>
            </div>
          </div>
          <div style={group}>
            <span style={fieldLabel}>Add an admin</span>
            <div style={wrap}>
              <input style={{ ...input, width: 160 }} placeholder="Their name" value={admName} onChange={(e) => setAdmName(e.target.value)} />
              <input style={{ ...input, width: 220 }} placeholder="Their email" value={adm} onChange={(e) => setAdm(e.target.value)} />
              <label style={check}><input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} /> Make owner</label>
              <label style={check}><input type="checkbox" checked={welcome} onChange={(e) => setWelcome(e.target.checked)} /> Send full welcome</label>
              <Pill disabled={!!busy || !adm.includes("@")} onClick={() => run("Add admin", { action: "addAdmin", email: adm, personName: admName, makeOwner: owner, sendEmail: welcome }, () => `Added ${adm}${owner ? " as the owner" : " as an admin"}. They have been emailed a sign-in link${welcome ? " and the welcome" : ""}.`, () => { setAdm(""); setAdmName(""); })}>{b("Add admin")}</Pill>
            </div>
          </div>
          <div style={group}>
            <span style={fieldLabel}>Add a manager</span>
            <div style={wrap}>
              <input style={{ ...input, width: 260 }} placeholder="Manager's email (all shops)" value={mgr} onChange={(e) => setMgr(e.target.value)} />
              <Pill disabled={!!busy || !mgr.includes("@")} onClick={() => run("Add manager", { action: "manager", email: mgr }, () => `Added ${mgr} as a manager of every shop. They have been emailed what they can do and their shop card links.`, () => setMgr(""))}>{b("Add manager")}</Pill>
            </div>
          </div>
        </div>
      </details>
      {note && (
        <p style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 14, background: note.ok ? "rgba(34,197,94,.18)" : "rgba(248,113,113,.2)", border: `1px solid ${note.ok ? "rgba(34,197,94,.5)" : "rgba(248,113,113,.6)"}` }} role="status">
          {note.ok && !busy ? "✓ " : note.ok ? "" : "✗ "}{note.text}
          {note.link && <> <a href={note.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", fontWeight: 700 }}>Open the company admin</a></>}
        </p>
      )}
    </div>
  );
}

export function CreateCompany() {
  const router = useRouter();
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [locations, setLocations] = useState("3");
  const [sendEmail, setSendEmail] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState("");
  async function create() {
    setBusy(true); setNote(sendEmail ? "Creating and sending the emails…" : "Creating…");
    const r = await call({ action: "create", name, adminEmail: email, locations: Number(locations), sendEmail });
    setBusy(false);
    setNote(r.ok ? `Created. ${sendEmail ? "Sign-in and welcome emails sent." : "No email sent; open it below as support, or sign in from their admin page."}` : r.data.error ?? "Failed");
    if (r.ok) { setName(""); setEmail(""); router.refresh(); }
  }
  return (
    <div>
      <p style={{ marginBottom: 14, fontSize: 14 }}>Creates the company free (no trial, no renewal) for the locations you choose, adds their admin, and opens support access for 30 days so you can check the setup.</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 2fr) minmax(200px, 2fr) 100px", gap: 12 }}>
        <label><span style={fieldLabel}>Company name</span><input style={{ ...input, width: "100%" }} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span style={fieldLabel}>Admin email</span><input style={{ ...input, width: "100%" }} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label><span style={fieldLabel}>Locations</span><input style={{ ...input, width: "100%" }} value={locations} onChange={(e) => setLocations(e.target.value)} inputMode="numeric" /></label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Email them the sign-in link and welcome</label>
        <Pill disabled={busy || !name.trim() || !email.trim()} onClick={create}>{busy ? "Working…" : "Create company"}</Pill>
      </div>
      {note && (
        <p style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 14, background: /^Created/.test(note) || /^Creating/.test(note) ? "rgba(34,197,94,.18)" : "rgba(248,113,113,.2)" }} role="status">{note}</p>
      )}
    </div>
  );
}

/// Removes a shop manager from a company that allows support access (for testing). Asks first, then says what happened.
export function RemoveManager({ orgId, email }: { orgId: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!confirm(`Remove ${email} as a manager? They will be signed out straight away.`)) return;
    setBusy(true); setError("");
    const r = await call({ action: "removeManager", orgId, email });
    setBusy(false);
    if (!r.ok) { setError(r.data.error ?? "That didn't work. Try again."); return; }
    router.refresh();
  }
  return (
    <>
      <span style={{ marginLeft: 8 }}><Pill small disabled={busy} onClick={remove}>{busy ? "Removing…" : "Remove"}</Pill></span>
      {error && <span style={{ color: "#fca5a5", marginLeft: 8 }}>{error}</span>}
    </>
  );
}

/// AIERT's "free for life" mark for a founding partner: the company is never charged, switched off or put on a trial clock.
export function LifeToggle({ orgId, on }: { orgId: string; on: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    if (!confirm(on ? "Remove free for life from this company?" : "Mark this company FREE FOR LIFE? It will never be charged or switched off.")) return;
    setBusy(true); setError("");
    const r = await call({ action: "freeForLife", orgId, on: !on });
    setBusy(false);
    if (!r.ok) { setError(r.data.error ?? "That didn't work. Try again."); return; }
    router.refresh();
  }
  return (
    <div style={{ marginTop: 6 }}>
      <Pill small disabled={busy} onClick={toggle}>{busy ? "Working…" : on ? "✓ Free for life (remove)" : "Mark free for life"}</Pill>
      {error && <div style={{ color: "#fca5a5", fontSize: 12 }}>{error}</div>}
    </div>
  );
}
