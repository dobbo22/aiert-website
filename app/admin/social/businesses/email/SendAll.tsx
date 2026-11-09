"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LogRow = { email: string; business: string; status: string; error: string | null; sent_at: string };

export default function SendAll({ eligible, suppressed, alreadySent, log }: { eligible: string[]; suppressed: number; alreadySent: number; log: LogRow[] }) {
  const [reviewed, setReviewed] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const ready = reviewed && word === "SEND" && eligible.length > 0 && !busy;

  async function send() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/social/businesses/send-all", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expected: eligible.length, confirm: word }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: json.failed === 0, text: `Sent ${json.sent}. ${json.failed ? `${json.failed} failed: ${(json.errors as string[]).join("; ")}` : "None failed."}` });
      setReviewed(false);
      setWord("");
      router.refresh();
    } else {
      setMsg({ ok: false, text: json.error ?? "Failed" });
    }
    setBusy(false);
  }

  return (
    <div className="social-post-card" style={{ borderColor: "rgba(250,204,21,.5)" }}>
      <p className="social-post-message"><strong>Send to the real recipients</strong></p>
      <p className="social-empty" style={{ textAlign: "left" }}>
        <strong>{eligible.length}</strong> people will get it now. Left out: {suppressed} who unsubscribed or bounced before, and {alreadySent} already sent this email. Nobody is ever emailed twice. When it finishes you get a summary email at martin@aiert.co.uk.
      </p>
      {eligible.length > 0 && <p className="social-empty" style={{ textAlign: "left" }}>{eligible.join(" · ")}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 10 }}>
        <label style={{ fontSize: ".88rem" }}><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I have read the test copies and I am happy with the wording</label>
        <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Type SEND" style={{ width: 110, background: "rgba(255,255,255,.05)", border: "1px solid rgba(148,163,184,.4)", borderRadius: 6, color: "inherit", padding: "6px 10px" }} />
        <button type="button" className="social-post-btn" disabled={!ready} onClick={send}>{busy ? "Sending… (about a second each)" : `Send to ${eligible.length} people`}</button>
      </div>
      {msg && <p className={`social-compose-status ${msg.ok ? "social-compose-success" : "social-compose-error"}`}>{msg.text}</p>}
      {log.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className="social-empty">Already sent ({log.length})</summary>
          {log.map((l) => (
            <p key={l.email} className={l.status === "failed" ? "social-compose-error" : "social-empty"} style={{ textAlign: "left" }}>
              {new Date(l.sent_at).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" })} · {l.business} · {l.status}{l.error ? `: ${l.error}` : ""}
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
