"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const btn = { border: "1px solid rgba(255,255,255,.5)", borderRadius: 8, padding: "6px 14px", marginRight: 8 } as const;
const input = { background: "#fff", color: "#111", border: "1px solid #9ca3af", borderRadius: 6, padding: "6px 10px", marginRight: 8, marginBottom: 8 } as const;

async function call(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/admin/tapcard/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({})) as { error?: string; url?: string; orgId?: string };
    return { ok: res.ok, data: res.ok || data.error ? data : { ...data, error: `The server answered ${res.status}. Sign in to the admin again, then retry.` } };
  } catch {
    return { ok: false, data: { error: "Couldn't reach the server. Check your connection and retry." } as { error?: string; url?: string; orgId?: string } };
  }
}

export function CompanyTools({ orgId, open, locations }: { orgId: string; open: boolean; locations: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [n, setN] = useState(String(locations));
  const [mgr, setMgr] = useState("");
  async function run(body: Record<string, unknown>, then?: (url?: string) => void) {
    setBusy(true); setNote("");
    const r = await call({ ...body, orgId });
    setBusy(false);
    if (!r.ok) { setNote(r.data.error ?? "Failed"); return; }
    then?.(r.data.url); router.refresh();
  }
  if (!open) return <span style={{ opacity: .6 }}>The company must allow support access first</span>;
  return (
    <span>
      <button type="button" style={btn} disabled={busy} onClick={() => run({ action: "open" }, (url) => url && window.open(url, "_blank", "noopener"))}>Open admin (support)</button>
      <input style={{ ...input, width: 54 }} value={n} onChange={(e) => setN(e.target.value)} inputMode="numeric" aria-label="Locations" />
      <button type="button" style={btn} disabled={busy} onClick={() => confirm(`Make this company free for ${n} locations?`) && run({ action: "free", locations: Number(n) })}>Make free</button>
      <br />
      <input style={{ ...input, width: 220, marginTop: 6 }} placeholder="Manager's email (all shops)" value={mgr} onChange={(e) => setMgr(e.target.value)} />
      <button type="button" style={btn} disabled={busy || !mgr.includes("@")} onClick={() => run({ action: "manager", email: mgr }, () => { setNote(`Manager added: ${mgr}. They have been emailed.`); setMgr(""); })}>Add manager</button>
      {note && <span style={{ color: note.startsWith("Manager added") ? "inherit" : "#fca5a5" }}>{note}</span>}
    </span>
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
      <button type="button" style={btn} disabled={busy || !name.trim() || !email.trim()} onClick={create}>{busy ? "…" : "Create"}</button>
      {note && <p style={{ marginTop: 6, fontSize: 14 }}>{note}</p>}
    </div>
  );
}
