"use client";

import { useState } from "react";
import { starters, MAX_OUTBOUND_PER_DAY } from "@/lib/linkedinPostLink";

type Prev = { resolved: string; key: string; preview: { author: string; text: string }; alreadyDone: boolean; usedToday: number };
type Done = { post_key: string; post_urn: string; author: string; text: string; created_at: string };

export default function CommentOnPost({ recent }: { recent: Done[] }) {
  const [url, setUrl] = useState("");
  const [prev, setPrev] = useState<Prev | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState(recent);

  async function call(body: object) {
    const res = await fetch("/api/admin/social/linkedin/comment-on", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, json: await res.json().catch(() => ({})) };
  }
  async function look() {
    setBusy(true); setMsg(null); setPrev(null);
    const r = await call({ action: "preview", url });
    if (r.ok) setPrev(r.json); else setMsg({ ok: false, text: r.json.error ?? "Failed" });
    setBusy(false);
  }
  async function send() {
    if (!prev) return;
    setBusy(true); setMsg(null);
    const r = await call({ action: "post", url, text, author: prev.preview.author });
    if (r.ok) {
      setMsg({ ok: true, text: "Posted as AIERT LTD." });
      setDone((d) => [{ post_key: prev.key, post_urn: r.json.urn, author: prev.preview.author, text, created_at: new Date().toISOString() }, ...d]);
      setPrev(null); setUrl(""); setText("");
    } else setMsg({ ok: false, text: r.json.error ?? "Failed" });
    setBusy(false);
  }

  return (
    <div className="social-post-card">
      <p className="social-post-message"><b>Comment on someone else&apos;s post</b></p>
      <p className="social-empty">
        Paste a LinkedIn post link (a short lnkd.in link works). Be a good neighbour: short, genuine, no links, no pitch. One comment per post, at most {MAX_OUTBOUND_PER_DAY} a day. You can&apos;t see replies here, so check LinkedIn.
      </p>
      <div className="social-compose-row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/… or https://lnkd.in/…" style={{ flex: 1, minWidth: 220, background: "rgba(255,255,255,.05)", border: "1px solid rgba(148,163,184,.4)", borderRadius: 6, color: "inherit", padding: "6px 10px" }} />
        <button type="button" className="social-post-btn" disabled={busy || !url.trim()} onClick={look}>{busy && !prev ? "Looking…" : "Look at post"}</button>
      </div>
      {msg && <p className={`social-compose-status ${msg.ok ? "social-compose-success" : "social-compose-error"}`}>{msg.text}</p>}
      {prev && (
        <div className="social-comment">
          <p className="social-post-message"><b>{prev.preview.author || "(author not shown)"}</b></p>
          {prev.preview.text && <p className="social-empty" style={{ textAlign: "left" }}>{prev.preview.text}</p>}
          {prev.alreadyDone && <p className="social-compose-error">The page has already commented on this post.</p>}
          <p className="social-empty">{prev.usedToday} of {MAX_OUTBOUND_PER_DAY} comments used in the last 24 hours.</p>
          <div className="social-compose-row">
            {starters(prev.preview.author).map((s) => <button key={s.label} type="button" className="social-comments-toggle" onClick={() => setText(s.text)}>{s.label}</button>)}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment as AIERT LTD…" maxLength={1250} />
          <div className="social-compose-row">
            <button type="button" className="social-post-btn" disabled={busy || prev.alreadyDone || !text.trim()} onClick={send}>{busy ? "Posting…" : "Post as AIERT LTD"}</button>
          </div>
        </div>
      )}
      {done.length > 0 && (
        <details>
          <summary className="social-empty">Comments made on other posts ({done.length})</summary>
          {done.map((d) => (
            <p key={d.post_key} className="social-empty" style={{ textAlign: "left" }}>
              {new Date(d.created_at).toLocaleDateString("en-GB")} · {d.author || "post"} · &ldquo;{d.text}&rdquo;
            </p>
          ))}
        </details>
      )}
    </div>
  );
}
