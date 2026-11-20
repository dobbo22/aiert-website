"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn, call, fieldLabel, input } from "./ui";

/// "Change this company": locations, add an admin, add a manager. Shown inside an opened company, only while support access is open.
export function ChangeCompany({ orgId, locations, run, busy }: { orgId: string; locations: number; busy: string | null; run: (label: string, body: Record<string, unknown>, done: (r: { url?: string }) => string, after?: () => void) => void }) {
  const [n, setN] = useState(String(locations));
  const [mgr, setMgr] = useState("");
  const [adm, setAdm] = useState(""), [admName, setAdmName] = useState(""), [owner, setOwner] = useState(true), [welcome, setWelcome] = useState(true);
  void orgId;
  const b = (label: string) => (busy === label ? "Working…" : label);
  const row = { display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,.15)" } as const;
  const wrap = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } as const;
  const check = { fontSize: 14, display: "flex", alignItems: "center", gap: 6 } as const;
  return (
    <div>
      <div style={row}>
        <span style={fieldLabel}>Locations</span>
        <div style={wrap}>
          <input style={{ ...input, width: 80 }} value={n} onChange={(e) => setN(e.target.value)} inputMode="numeric" aria-label="Number of locations" />
          <Btn tone="primary" disabled={!!busy} onClick={() => confirm(`Set this company to ${n} locations (free)? It is ${locations} now.`) && run("Set locations", { action: "free", locations: Number(n) }, () => `Done: free for ${n} locations.`)}>{b("Set locations")}</Btn>
        </div>
      </div>
      <div style={row}>
        <span style={fieldLabel}>Add an admin</span>
        <div style={wrap}>
          <input style={{ ...input, width: 160 }} placeholder="Their name" value={admName} onChange={(e) => setAdmName(e.target.value)} />
          <input style={{ ...input, width: 220 }} placeholder="Their email" value={adm} onChange={(e) => setAdm(e.target.value)} />
          <label style={check}><input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} /> Make owner</label>
          <label style={check}><input type="checkbox" checked={welcome} onChange={(e) => setWelcome(e.target.checked)} /> Send full welcome</label>
          <Btn tone="primary" disabled={!!busy || !adm.includes("@")} onClick={() => run("Add admin", { action: "addAdmin", email: adm, personName: admName, makeOwner: owner, sendEmail: welcome }, () => `Added ${adm}${owner ? " as the owner" : " as an admin"}. They have been emailed a sign-in link${welcome ? " and the full welcome" : ""}.`, () => { setAdm(""); setAdmName(""); })}>{b("Add admin")}</Btn>
        </div>
      </div>
      <div style={row}>
        <span style={fieldLabel}>Add a manager</span>
        <div style={wrap}>
          <input style={{ ...input, width: 260 }} placeholder="Manager's email (all shops)" value={mgr} onChange={(e) => setMgr(e.target.value)} />
          <Btn tone="primary" disabled={!!busy || !mgr.includes("@")} onClick={() => run("Add manager", { action: "manager", email: mgr }, () => `Added ${mgr} as a manager of every shop. They have been emailed what they can do and their shop card links.`, () => setMgr(""))}>{b("Add manager")}</Btn>
        </div>
      </div>
    </div>
  );
}

export function CreateCompany() {
  const router = useRouter();
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [locations, setLocations] = useState("3");
  const [sendEmail, setSendEmail] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const [listed, setListed] = useState(false);
  async function create() {
    setBusy(true); setNote(sendEmail ? "Creating and sending the emails…" : "Creating…");
    const r = await call({ action: "create", name, adminEmail: email, locations: listed ? 1 : Number(locations), sendEmail, listed });
    setBusy(false);
    setNote(r.ok ? `Created. ${sendEmail ? "Sign-in and welcome emails sent." : "No email sent; open it in the list, or sign in from their admin page."}` : r.data.error ?? "Failed");
    if (r.ok) { setName(""); setEmail(""); router.refresh(); }
  }
  return (
    <div>
      <p style={{ marginBottom: 14, fontSize: 14 }}>Creates the company free (no trial, no renewal) for the locations you choose, adds their admin, and opens support access for 30 days so you can check the setup.</p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 2fr) minmax(200px, 2fr) 100px", gap: 12 }}>
        <label><span style={fieldLabel}>Company name</span><input style={{ ...input, width: "100%" }} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span style={fieldLabel}>Admin email</span><input style={{ ...input, width: "100%" }} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label><span style={fieldLabel}>Locations</span><input style={{ ...input, width: "100%", opacity: listed ? 0.6 : 1 }} value={listed ? "1" : locations} disabled={listed} onChange={(e) => setLocations(e.target.value)} inputMode="numeric" /></label>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} /> Listed company (investor relations admin)</label>
        <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Email them the sign-in link and welcome</label>
        <Btn tone="primary" disabled={busy || !name.trim() || !email.trim()} onClick={create}>{busy ? "Working…" : "Create company"}</Btn>
      </div>
      {note && <p style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 14, background: /^Created/.test(note) || /^Creating/.test(note) ? "rgba(34,197,94,.18)" : "rgba(248,113,113,.2)" }} role="status">{note}</p>}
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
      <span style={{ marginLeft: 8 }}><Btn small tone="danger" disabled={busy} onClick={remove}>{busy ? "Removing…" : "Remove"}</Btn></span>
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
    <div>
      <Btn small disabled={busy} onClick={toggle}>{busy ? "Working…" : on ? "Remove free for life" : "Mark free for life"}</Btn>
      {error && <div style={{ color: "#fca5a5", fontSize: 12 }}>{error}</div>}
    </div>
  );
}

/// Which admin the company sees: the investor relations one for a listed company (followers, post a headline, cards and QR), or the shop one.
export function ListedToggle({ orgId, on }: { orgId: string; on: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    if (!confirm(on ? "Switch this company back to the ordinary company admin?" : "Switch this company to the listed company (investor relations) admin?")) return;
    setBusy(true); setError("");
    const r = await call({ action: "listed", orgId, on: !on });
    setBusy(false);
    if (!r.ok) { setError(r.data.error ?? "That didn't work. Try again."); return; }
    router.refresh();
  }
  return (
    <div>
      <Btn small disabled={busy} onClick={toggle}>{busy ? "Working…" : on ? "Switch to ordinary admin" : "Use listed company admin"}</Btn>
      {error && <div style={{ color: "#fca5a5", fontSize: 12 }}>{error}</div>}
    </div>
  );
}
