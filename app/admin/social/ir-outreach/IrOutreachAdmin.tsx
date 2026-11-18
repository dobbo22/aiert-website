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
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("company");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "inherit" } as const;
  async function add() {
    setBusy(true); setError("");
    const r = await post({ action: "add", name, org, email, kind });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    setName(""); setOrg(""); setEmail(""); router.refresh();
  }
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input style={field} value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organisation" />
      <input style={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" />
      <select style={field} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Who they are">
        <option value="company">Listed company (IR, finance, chair)</option>
        <option value="agency">IR or PR adviser or agency</option>
        <option value="broker">Broker, NOMAD or corporate finance</option>
        <option value="contact">Someone I know</option>
      </select>
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

interface Mail { subject: string; html: string; text: string }

export function WriteEmail({ to, first, followup }: { to: string; first: Mail; followup: Mail }) {
  const [step, setStep] = useState<"first" | "followup">("first");
  const [note, setNote] = useState("");
  const m = step === "first" ? first : followup;
  const btn = { padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "inherit", marginRight: 6, marginBottom: 6 } as const;
  const say = (s: string) => { setNote(s); setTimeout(() => setNote(""), 2500); };
  async function copyRich() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([m.html], { type: "text/html" }), "text/plain": new Blob([m.text], { type: "text/plain" }) })]);
      say("Copied with the picture: paste it into a new email");
    } catch {
      try { await navigator.clipboard.writeText(m.text); say("Copied as plain text"); } catch { say("Could not copy"); }
    }
  }
  const mailto = `mailto:${to}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.text)}`;
  return (
    <details style={{ marginTop: 6 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Write email</summary>
      <div style={{ marginTop: 8, maxWidth: 680 }}>
        <div style={{ marginBottom: 8 }}>
          <button type="button" style={{ ...btn, background: step === "first" ? "#fff" : "transparent", color: step === "first" ? "#111" : "inherit" }} onClick={() => setStep("first")}>First email</button>
          <button type="button" style={{ ...btn, background: step === "followup" ? "#fff" : "transparent", color: step === "followup" ? "#111" : "inherit" }} onClick={() => setStep("followup")}>Follow-up (about 5 working days later)</button>
        </div>
        <p><strong>Subject:</strong> {m.subject}</p>
        <div style={{ background: "#fff", color: "#111", borderRadius: 10, padding: 14, margin: "8px 0" }} dangerouslySetInnerHTML={{ __html: m.html }} />
        <button type="button" style={btn} onClick={copyRich}>Copy email with picture</button>
        <button type="button" style={btn} onClick={async () => { try { await navigator.clipboard.writeText(m.subject); say("Subject copied"); } catch { say("Could not copy"); } }}>Copy subject</button>
        <button type="button" style={btn} onClick={async () => { try { await navigator.clipboard.writeText(m.text); say("Plain text copied"); } catch { say("Could not copy"); } }}>Copy plain text</button>
        <a href={mailto} style={{ ...btn, display: "inline-block", textDecoration: "none" }}>Open in my email app</a>
        {note && <span style={{ color: "#4ade80" }}>{note}</span>}
        <p style={{ fontSize: 13, marginTop: 6 }}>Check it before you send. After you send, press Mark sent. A follow-up should go only if there has been no reply, and never mentions what we can see.</p>
      </div>
    </details>
  );
}

const EVENT_TYPES: [string, string][] = [
  ["email-sent", "Email I sent"], ["email-received", "Email they sent"], ["message-sent", "Message I sent (WhatsApp, text)"],
  ["message-received", "Message they sent"], ["meeting", "Meeting or call"], ["note", "Note"],
];

// Adds one line to a person's timeline: what was said or done, and when (defaults to now).
export function AddEvent({ token }: { token: string }) {
  const router = useRouter();
  const [kind, setKind] = useState("email-sent");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = { padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "inherit" } as const;
  async function add() {
    setBusy(true); setError("");
    const r = await post({ action: "event", token, kind, title, detail, at: at ? new Date(at).toISOString() : undefined });
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Something went wrong."); return; }
    setTitle(""); setDetail(""); setAt(""); router.refresh();
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      <select style={field} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="What happened">
        {EVENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <input style={{ ...field, minWidth: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Subject or what happened" maxLength={160} />
      <input style={{ ...field, minWidth: 220 }} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detail (optional)" maxLength={600} />
      <input style={field} type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} aria-label="When (blank is now)" />
      <button type="button" onClick={add} disabled={busy || title.trim().length < 2} style={{ ...field, background: "#FBBF24", color: "#111", fontWeight: 700, border: "none" }}>Add to timeline</button>
      {error && <span style={{ color: "#fca5a5" }}>{error}</span>}
    </div>
  );
}

export function RemoveEvent({ token, id }: { token: string; id: number }) {
  const router = useRouter();
  return <button type="button" aria-label="Remove this line" onClick={async () => { if (window.confirm("Remove this line from the timeline?")) { await post({ action: "delete-event", token, id }); router.refresh(); } }} style={{ marginLeft: 8, padding: "0 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "inherit", fontSize: 12 }}>Remove</button>;
}
