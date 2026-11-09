"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TARGETS, TARGET_LABEL, type QueueRow, type Target } from "@/lib/socialQueueShared";

const STATUS: Record<string, string> = { pending: "Scheduled", sending: "Sending…", sent: "Posted", partial: "Partly posted", failed: "Failed", cancelled: "Cancelled" };

export default function ScheduleManager({ initial }: { initial: QueueRow[] }) {
  const [rows, setRows] = useState(initial);
  const [kind, setKind] = useState<"post" | "poll" | "document">("post");
  const [targets, setTargets] = useState<Target[]>(["linkedin_page"]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const toggle = (t: Target) => setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const linkedinOnly = kind !== "post";
  const allowed = linkedinOnly ? TARGETS.filter((t) => t !== "facebook") : TARGETS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setBusy(true);
    setStatus(null);
    const fd = new FormData(formRef.current);
    fd.delete("targets");
    for (const t of targets.filter((t) => allowed.includes(t))) fd.append("targets", t);
    const res = await fetch("/api/admin/social/schedule", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      setStatus({ ok: true, text: fd.get("when") ? "Scheduled." : "Posting now…" });
      formRef.current.reset();
      router.refresh();
    } else {
      setStatus({ ok: false, text: json.error ?? "Failed" });
    }
    setBusy(false);
  }

  async function cancel(id: number) {
    await fetch("/api/admin/social/schedule/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
  }

  return (
    <div>
      <form ref={formRef} onSubmit={submit} className="social-compose">
        <div className="social-compose-row">
          <label>
            Type{" "}
            <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="post">Post (text, optional image)</option>
              <option value="poll">Poll (LinkedIn)</option>
              <option value="document">PDF carousel (LinkedIn)</option>
            </select>
          </label>
          <label>
            When (UK time){" "}
            <input type="datetime-local" name="when" />
          </label>
          <span className="social-format-hint">Leave the time empty to post now.</span>
        </div>
        <div className="social-compose-row">
          {allowed.map((t) => (
            <label key={t}>
              <input type="checkbox" checked={targets.includes(t)} onChange={() => toggle(t)} /> {TARGET_LABEL[t]}
            </label>
          ))}
        </div>
        <textarea name="body" placeholder={kind === "poll" ? "A line above the poll…" : "Write the post…"} required maxLength={3000} />
        {kind === "poll" && (
          <div>
            <input name="pollQuestion" placeholder="Poll question (max 140 characters)" maxLength={140} required />
            {[1, 2, 3, 4].map((n) => (
              <input key={n} name={`pollOption${n}`} placeholder={`Option ${n}${n > 2 ? " (optional)" : ""} (max 30 characters)`} maxLength={30} required={n <= 2} />
            ))}
            <label>
              Open for{" "}
              <select name="pollDuration" defaultValue="THREE_DAYS">
                <option value="ONE_DAY">1 day</option>
                <option value="THREE_DAYS">3 days</option>
                <option value="SEVEN_DAYS">1 week</option>
                <option value="FOURTEEN_DAYS">2 weeks</option>
              </select>
            </label>
          </div>
        )}
        {kind === "post" && <input type="file" name="file" accept="image/*" />}
        {kind === "document" && <input type="file" name="file" accept=".pdf,.ppt,.pptx,.doc,.docx" required />}
        <div className="social-compose-row">
          <button type="submit" className="social-post-btn" disabled={busy || targets.length === 0}>
            {busy ? "Saving…" : "Schedule / post"}
          </button>
        </div>
        {status && <p className={`social-compose-status ${status.ok ? "social-compose-success" : "social-compose-error"}`}>{status.text}</p>}
      </form>

      <p className="social-empty">The queue is checked every 15 minutes. A post that fails is never retried automatically, so it can't be posted twice.</p>
      {rows.length === 0 && <p className="social-empty">Nothing scheduled.</p>}
      {rows.map((r) => (
        <div key={r.id} className="social-post-card">
          <div className="social-post-meta">
            <span>{new Date(r.run_at).toLocaleString("en-GB", { timeZone: "Europe/London" })} (UK)</span>
            <span>{STATUS[r.status] ?? r.status}</span>
            <span>{r.kind === "poll" ? "Poll" : r.kind === "document" ? "PDF" : r.media_url ? "Image" : "Text"}</span>
          </div>
          <p className="social-post-message">{r.body}</p>
          <p className="social-empty">{r.targets.map((t) => TARGET_LABEL[t]).join(" · ")}</p>
          {r.results &&
            Object.entries(r.results).map(([t, res]) => (
              <p key={t} className={res.ok ? "social-empty" : "social-compose-error"}>
                {TARGET_LABEL[t as Target] ?? t}: {res.ok ? <a href={res.url} target="_blank" rel="noreferrer">posted</a> : res.error}
              </p>
            ))}
          {r.status === "pending" && (
            <button type="button" className="social-comments-toggle" onClick={() => cancel(r.id)}>
              Cancel
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
