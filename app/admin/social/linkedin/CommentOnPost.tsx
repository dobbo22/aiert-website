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
    <div className="social-post-card lk-card">
      <p className="lk-title">Comment on someone else&apos;s post</p>
      <p className="lk-note">
        Paste a LinkedIn post link (a short lnkd.in link works). Be a good neighbour: short, genuine, no links, no pitch. One comment per post, at most {MAX_OUTBOUND_PER_DAY} a day.
        You can&apos;t see replies here, so check LinkedIn.
      </p>
      <div className="lk-row">
        <input className="lk-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/posts/… or https://lnkd.in/…" />
        <button type="button" className="social-post-btn" disabled={busy || !url.trim()} onClick={look}>{busy && !prev ? "Looking…" : "Look at post"}</button>
      </div>
      {msg && <p className={`social-compose-status ${msg.ok ? "social-compose-success" : "social-compose-error"}`} style={{ margin: 0 }}>{msg.text}</p>}
      {prev && (
        <div className="lk-item">
          <p className="lk-name">{prev.preview.author || "(author not shown)"}</p>
          {prev.preview.text && <p className="lk-quote">{prev.preview.text}</p>}
          {prev.alreadyDone && <p className="social-compose-error" style={{ margin: 0 }}>The page has already commented on this post.</p>}
          <p className="lk-note">{prev.usedToday} of {MAX_OUTBOUND_PER_DAY} comments used in the last 24 hours.</p>
          <div className="lk-row">
            {starters(prev.preview.author).map((s) => <button key={s.label} type="button" className="social-comments-toggle" onClick={() => setText(s.text)}>{s.label}</button>)}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment as AIERT LTD…" maxLength={1250} />
          <div className="lk-row">
            <button type="button" className="social-post-btn" disabled={busy || prev.alreadyDone || !text.trim()} onClick={send}>{busy ? "Posting…" : "Post as AIERT LTD"}</button>
          </div>
        </div>
      )}
      {done.length > 0 && (
        <details>
          <summary>Comments made on other posts ({done.length})</summary>
          <div className="lk-list">
            {done.map((d) => (
              <p key={d.post_key} className="lk-note">
                {new Date(d.created_at).toLocaleDateString("en-GB")} · {d.author || "post"} · &ldquo;{d.text}&rdquo;
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
