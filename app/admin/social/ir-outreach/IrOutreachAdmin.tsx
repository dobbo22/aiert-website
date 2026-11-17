"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/tapcard/ir-outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; link?: string };
}

export function AddRecipient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "inherit" } as const;
  async function add() {
    setBusy(true); setError("");
    const r = await post({ action: "add", name, org });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    setName(""); setOrg(""); router.refresh();
  }
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input style={field} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organisation" />
      <button type="button" onClick={add} disabled={busy || name.trim().length < 2} style={{ ...field, background: "#FBBF24", color: "#111", fontWeight: 700, border: "none" }}>Make a personal link</button>
      {error && <span style={{ color: "#fca5a5" }}>{error}</span>}
    </div>
  );
}

export function RowActions({ token, link, sent }: { token: string; link: string; sent: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const btn = { padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "inherit", marginRight: 6 } as const;
  return (
    <span>
      <button type="button" style={btn} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { window.prompt("Copy this link", link); } }}>{copied ? "Copied" : "Copy link"}</button>
      {!sent && <button type="button" style={btn} onClick={async () => { await post({ action: "sent", token }); router.refresh(); }}>Mark sent</button>}
      <button type="button" style={btn} onClick={async () => { if (window.confirm("Remove this link and its history?")) { await post({ action: "delete", token }); router.refresh(); } }}>Remove</button>
    </span>
  );
}
