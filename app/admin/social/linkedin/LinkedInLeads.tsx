"use client";

import { useState } from "react";
import type { Lead, Mention } from "@/lib/linkedinEngagement";
import { connectNote, profileUrl } from "@/lib/linkedinEngagement";

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

  return (
    <div className="social-post-card">
      <p className="social-post-message"><b>{newCount}</b> new warm lead{newCount === 1 ? "" : "s"} on LinkedIn</p>
      <p className="social-empty">
        People who reacted to or commented on the page&apos;s posts. Scanned once a day{lastScan ? ` (last: ${new Date(lastScan).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" })})` : ""}.
        Open their profile, send a connection request with the note below, then mark them Contacted. Reactions on your personal-profile posts can&apos;t be seen by the API.
      </p>
      <div className="social-compose-row">
        <button type="button" className="social-post-btn" disabled={busy} onClick={scan}>{busy ? "Scanning…" : "Scan now"}</button>
        <label style={{ fontSize: ".88rem" }}><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show contacted and ignored</label>
      </div>
      {msg && <p className="social-empty">{msg}</p>}
      {shown.length === 0 && <p className="social-empty">No new leads yet. Reactions and comments show up after the next scan.</p>}
      {shown.map((l) => {
        const note = connectNote(l.name, l.actions);
        const url = profileUrl(l);
        return (
          <div key={l.person_id} className="social-comment">
            <p className="social-post-message">
              <b>{l.name || "(name not available)"}</b> · {l.actions}{l.status !== "new" ? ` · ${l.status}` : ""}
            </p>
            {l.headline && <p className="social-empty">{l.headline}</p>}
            {l.actions.includes("commented") && l.last_detail && <p className="social-empty">&ldquo;{l.last_detail}&rdquo;</p>}
            <p className="social-post-meta">
              <span>{new Date(l.last_at).toLocaleDateString("en-GB")}</span>
              {url ? <a href={url} target="_blank" rel="noreferrer">Open profile</a> : <span>No profile link available</span>}
            </p>
            <p className="social-empty" style={{ textAlign: "left" }}>{note}</p>
            <div className="social-compose-row">
              <button type="button" className="social-comments-toggle" onClick={() => copy(note)}>Copy note</button>
              {l.status !== "contacted" && <button type="button" className="social-post-btn" onClick={() => setStatus(l.person_id, "contacted")}>Mark contacted</button>}
              {l.status !== "ignore" && <button type="button" className="social-comments-toggle" onClick={() => setStatus(l.person_id, "ignore")}>Not relevant</button>}
              {l.status !== "new" && <button type="button" className="social-comments-toggle" onClick={() => setStatus(l.person_id, "new")}>Back to new</button>}
            </div>
          </div>
        );
      })}
      {mentions.length > 0 && (
        <details>
          <summary className="social-empty">Mentions of the page ({mentions.length})</summary>
          <p className="social-empty" style={{ textAlign: "left" }}>LinkedIn only tells us that someone mentioned AIERT LTD, not who. Open the page&apos;s notifications on LinkedIn to see and reply.</p>
          {mentions.map((m) => (
            <p key={m.notification_id} className="social-empty" style={{ textAlign: "left" }}>
              {new Date(m.occurred_at).toLocaleDateString("en-GB")} · <a href="https://www.linkedin.com/notifications/" target="_blank" rel="noreferrer">Open notifications</a>
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
