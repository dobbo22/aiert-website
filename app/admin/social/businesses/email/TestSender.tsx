"use client";

import { useState } from "react";

type R = { email: string; business: string; firstName: string };

export default function TestSender({ addresses, recipients }: { addresses: string[]; recipients: R[] }) {
  const preset = recipients.filter((r) => /kpmg|focused financial/i.test(r.business)).map((r) => r.email);
  const [picked, setPicked] = useState<string[]>(preset.length ? preset : recipients.slice(0, 2).map((r) => r.email));
  const [to, setTo] = useState(addresses[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const toggle = (e: string) => setPicked((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));

  async function send() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/social/businesses/test-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, emails: picked }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      const bad = (json.results as { business: string; ok: boolean; error?: string }[]).filter((r) => !r.ok);
      setMsg(bad.length ? { ok: false, text: bad.map((b) => `${b.business}: ${b.error}`).join("; ") } : { ok: true, text: `Sent ${json.results.length} test copies to ${to}. Nothing went to the real recipients.` });
    } else {
      setMsg({ ok: false, text: json.error ?? "Failed" });
    }
    setBusy(false);
  }

  return (
    <div className="social-post-card">
      <p className="social-post-message"><strong>Send test copies to me</strong> (up to 5; never to the real recipients)</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "8px 0" }}>
        {recipients.map((r) => (
          <label key={r.email} style={{ fontSize: ".85rem" }}><input type="checkbox" checked={picked.includes(r.email)} onChange={() => toggle(r.email)} /> {r.business}</label>
        ))}
      </div>
      <div className="social-compose-row">
        <label>Send to{" "}
          <select value={to} onChange={(e) => setTo(e.target.value)} style={{ background: "#0f172a", border: "1px solid rgba(148,163,184,.4)", borderRadius: 6, color: "inherit", padding: "6px 10px" }}>
            {addresses.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <button type="button" className="social-post-btn" disabled={busy || picked.length === 0 || picked.length > 5} onClick={send}>{busy ? "Sending…" : `Send ${picked.length} test ${picked.length === 1 ? "copy" : "copies"}`}</button>
        {msg && <span className={`social-compose-status ${msg.ok ? "social-compose-success" : "social-compose-error"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
