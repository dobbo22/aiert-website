"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input = { background: "#fff", color: "#111", border: "1px solid #9ca3af", borderRadius: 8, padding: "8px 12px", marginRight: 8, marginBottom: 8 } as const;

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

  if (!open) return <span style={{ opacity: .6 }}>The company must allow support access first</span>;
  const b = (label: string) => (busy === label ? "Working…" : label);
  const row = { display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "nowrap" } as const;
  const label = { fontSize: 13, opacity: 0.75, minWidth: 96 } as const;
  return (
    <div style={{ minWidth: 420 }}>
      <div style={row}>
        <span style={label}>Company admin</span>
        <Pill disabled={!!busy} onClick={() => run("Open admin (support)", { action: "open" }, () => "Sign-in link ready (it works once and lasts 15 minutes).")}>{b("Open admin (support)")}</Pill>
      </div>
      <div style={row}>
        <span style={label}>Locations</span>
        <input style={{ ...input, width: 64, marginRight: 0, marginBottom: 0 }} value={n} onChange={(e) => setN(e.target.value)} inputMode="numeric" aria-label="Number of locations" />
        <Pill disabled={!!busy} onClick={() => confirm(`Set this company to ${n} locations (free)? It is ${locations} now.`) && run("Set locations", { action: "free", locations: Number(n) }, () => `Done: free for ${n} locations.`)}>{b("Set locations")}</Pill>
      </div>
      <div style={row}>
        <span style={label}>Add manager</span>
        <input style={{ ...input, width: 190, marginRight: 0, marginBottom: 0 }} placeholder="Manager's email (all shops)" value={mgr} onChange={(e) => setMgr(e.target.value)} />
        <Pill disabled={!!busy || !mgr.includes("@")} onClick={() => run("Add manager", { action: "manager", email: mgr }, () => `Added ${mgr} as a manager of every shop. They have been emailed what they can do and their shop card links.`, () => setMgr(""))}>{b("Add manager")}</Pill>
      </div>
      {note && (
        <p style={{ marginTop: 6, padding: "6px 10px", borderRadius: 8, fontSize: 14, background: note.ok ? "rgba(34,197,94,.18)" : "rgba(248,113,113,.2)", border: `1px solid ${note.ok ? "rgba(34,197,94,.5)" : "rgba(248,113,113,.6)"}` }} role="status">
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
      <p style={{ marginBottom: ".5rem", fontSize: 14 }}>Creates the company free (no trial, no renewal) for the locations you choose, adds their admin, and opens support access for 30 days so you can check the setup.</p>
      <input style={input} placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
      <input style={input} placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={{ ...input, width: 60 }} value={locations} onChange={(e) => setLocations(e.target.value)} inputMode="numeric" aria-label="Locations" />
      <label style={{ marginRight: 8 }}><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Email them the sign-in link and welcome</label>
      <Pill disabled={busy || !name.trim() || !email.trim()} onClick={create}>{busy ? "…" : "Create"}</Pill>
      {note && (
        <p style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, fontSize: 14, background: /^Created/.test(note) || /^Creating/.test(note) ? "rgba(34,197,94,.18)" : "rgba(248,113,113,.2)" }} role="status">{note}</p>
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
