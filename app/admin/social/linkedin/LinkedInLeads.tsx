"use client";

import { useState } from "react";
import type { Lead, Mention } from "@/lib/linkedinEngagement";
import { connectNote, profileUrl } from "@/lib/linkedinLeadText";

export default function LinkedInLeads({ initial, mentions, lastScan }: { initial: Lead[]; mentions: Mention[]; lastScan: string | null }) {
  const [leads, setLeads] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function post(body: object) {
    const res = await fetch("/api/admin/social/linkedin/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, json: await res.json().catch(() => ({})) };
  }
  async function setStatus(id: string, status: Lead["status"]) {
    const r = await post({ action: "status", id, status });
    if (r.ok) setLeads((p) => p.map((l) => (l.person_id === id ? { ...l, status } : l)));
    else setMsg(r.json.error ?? "Failed");
  }
  async function scan() {
    setBusy(true);
    setMsg(null);
    const r = await post({ action: "scan" });
    setMsg(r.ok ? `Scanned ${r.json.posts} posts: ${r.json.events} reactions/comments, ${r.json.newPeople} new people, ${r.json.mentions} new mentions. Reload to see them.` : r.json.error ?? "Failed");
    setBusy(false);
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setMsg("Note copied."); } catch { setMsg("Could not copy: select the text instead."); }
  }

  const shown = leads.filter((l) => showAll || l.status === "new");
  const newCount = leads.filter((l) => l.status === "new").length;
  const scanned = lastScan ? new Date(lastScan).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" }) : "not yet";

  return (
    <div className="social-post-card lk-card">
      <p className="lk-title">Warm leads: {newCount} new</p>
      <p className="lk-note">
        People who reacted to or commented on the page&apos;s posts. Open their profile, send a connection request with the note, then mark them Contacted.
        Reactions on your personal-profile posts can&apos;t be seen by the API.
      </p>
      <div className="lk-row">
        <button type="button" className="social-post-btn" disabled={busy} onClick={scan}>{busy ? "Scanning…" : "Scan now"}</button>
        <span className="lk-note">Last scan: {scanned} (runs daily)</span>
        <label className="lk-check"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show contacted and ignored</label>
      </div>
      {msg && <p className="lk-note">{msg}</p>}
      {shown.length === 0 && <p className="lk-note">No new leads yet. Reactions and comments show up after the next scan.</p>}
      {shown.length > 0 && (
        <div className="lk-list">
          {shown.map((l) => {
            const note = connectNote(l.name, l.actions);
            const url = profileUrl(l);
            return (
              <div key={l.person_id} className="lk-item">
                <div className="lk-head">
                  <p className="lk-name">{l.name || "(name not available)"}</p>
                  <span className={`lk-chip ${l.status === "new" ? "lk-chip-new" : ""}`}>{l.status === "new" ? l.actions : `${l.status} · ${l.actions}`}</span>
                </div>
                {l.headline && <p className="lk-note">{l.headline}</p>}
                {l.actions.includes("commented") && l.last_detail && <p className="lk-quote">&ldquo;{l.last_detail}&rdquo;</p>}
                <p className="lk-meta">
                  <span>{new Date(l.last_at).toLocaleDateString("en-GB")}</span>
                  {url ? <a href={url} target="_blank" rel="noreferrer">Open profile</a> : <span>No profile link available</span>}
                </p>
                <p className="lk-draft">{note}</p>
                <div className="lk-row">
                  <button type="button" className="social-comments-toggle" onClick={() => copy(note)}>Copy note</button>
                  {l.status !== "contacted" && <button type="button" className="social-post-btn" onClick={() => setStatus(l.person_id, "contacted")}>Mark contacted</button>}
                  {l.status !== "ignore" && <button type="button" className="social-comments-toggle" onClick={() => setStatus(l.person_id, "ignore")}>Not relevant</button>}
                  {l.status !== "new" && <button type="button" className="social-comments-toggle" onClick={() => setStatus(l.person_id, "new")}>Back to new</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {mentions.length > 0 && (
        <details>
          <summary>Mentions of the page ({mentions.length})</summary>
          <p className="lk-note">LinkedIn only tells us that someone mentioned AIERT LTD, not who. Open the page&apos;s notifications on LinkedIn to see and reply.</p>
          <div className="lk-list" style={{ marginTop: "0.6rem" }}>
            {mentions.map((m) => (
              <p key={m.notification_id} className="lk-meta">
                <span>{new Date(m.occurred_at).toLocaleDateString("en-GB")}</span>
                <a href="https://www.linkedin.com/notifications/" target="_blank" rel="noreferrer">Open notifications</a>
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
