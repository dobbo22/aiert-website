"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TARGETS, TARGET_LABEL, type QueueRow, type Target } from "@/lib/socialQueueShared";

type Kind = "post" | "poll" | "document";

const KINDS: { id: Kind; title: string; hint: string }[] = [
  { id: "post", title: "Post", hint: "Text, with an optional image" },
  { id: "poll", title: "Poll", hint: "A question people vote on (LinkedIn)" },
  { id: "document", title: "PDF carousel", hint: "A swipeable document (LinkedIn)" },
];
const TARGET_HINT: Record<Target, string> = { linkedin_page: "Company page", linkedin_person: "Your own profile", facebook: "Facebook page" };
const STATUS_LABEL: Record<string, string> = { pending: "Scheduled", sending: "Sending…", sent: "Posted", partial: "Partly posted", failed: "Failed", cancelled: "Cancelled" };

// The UK wall-clock time (as "YYYY-MM-DDTHH:mm") for a moment offset from now, to pre-fill the date box.
function londonLocal(offsetMs: number, hour?: number): string {
  const d = new Date(Date.now() + offsetMs);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const g = (k: string) => parts.find((p) => p.type === k)?.value ?? "00";
  const hh = hour !== undefined ? String(hour).padStart(2, "0") : g("hour") === "24" ? "00" : g("hour");
  const mm = hour !== undefined ? "00" : g("minute");
  return `${g("year")}-${g("month")}-${g("day")}T${hh}:${mm}`;
}
function nextMondayOffset(): number {
  const dow = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date()) + "T12:00:00Z").getUTCDay(); // 0 = Sunday
  return (((8 - dow) % 7) || 7) * 86_400_000;
}

export default function ScheduleManager({ initial }: { initial: QueueRow[] }) {
  const [rows, setRows] = useState(initial);
  const [kind, setKind] = useState<Kind>("post");
  const [targets, setTargets] = useState<Target[]>(["linkedin_page"]);
  const [body, setBody] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const allowed = kind === "post" ? TARGETS : TARGETS.filter((t) => t !== "facebook");
  const chosen = targets.filter((t) => allowed.includes(t));
  const toggle = (t: Target) => setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const pollReady = kind !== "poll" || (question.trim() && options.filter((o) => o.trim()).length >= 2);
  const canSend = body.trim() && chosen.length > 0 && pollReady && (mode === "now" || when);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current || !canSend) return;
    setBusy(true);
    setStatus(null);
    const fd = new FormData(formRef.current);
    fd.delete("targets");
    for (const t of chosen) fd.append("targets", t);
    const res = await fetch("/api/admin/social/schedule", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus({ ok: true, text: mode === "now" ? "Sent. See the result in the list below." : "Scheduled. It will go out within 15 minutes of that time." });
      setBody("");
      setQuestion("");
      setOptions(["", "", "", ""]);
      setFileName("");
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
      <form ref={formRef} onSubmit={submit} className="sch-form">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="when" value={mode === "now" ? "" : when} />

        <section className="sch-step">
          <h3><span>1</span> What are you posting?</h3>
          <div className="sch-seg">
            {KINDS.map((k) => (
              <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                {k.title}
                <small>{k.hint}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="sch-step">
          <h3><span>2</span> Where should it go?</h3>
          <div className="sch-cards">
            {allowed.map((t) => (
              <label key={t} className="sch-card">
                <input type="checkbox" checked={targets.includes(t)} onChange={() => toggle(t)} />
                <span>
                  <strong>{TARGET_LABEL[t].replace(/^[^:]+: /, "")}</strong>
                  <small>{t.startsWith("linkedin") ? "LinkedIn" : "Facebook"} · {TARGET_HINT[t]}</small>
                </span>
              </label>
            ))}
          </div>
          {kind !== "post" && <p className="social-empty" style={{ textAlign: "left" }}>Polls and PDFs can only go to LinkedIn.</p>}
        </section>

        <section className="sch-step">
          <h3><span>3</span> Write it</h3>
          <div className="sch-field">
            <label htmlFor="sch-body">
              {kind === "poll" ? "A line above the poll" : "Post text"}
              <em>{body.length} / 3000</em>
            </label>
            <textarea id="sch-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} placeholder={kind === "poll" ? "A quick one for anyone who runs a shop, café or salon." : "What do you want to say?"} />
          </div>

          {kind === "poll" && (
            <div className="sch-poll">
              <div className="sch-field">
                <label htmlFor="sch-q">Poll question <em>{question.length} / 140</em></label>
                <input id="sch-q" type="text" name="pollQuestion" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder="How do you tell customers about offers?" />
              </div>
              {options.map((o, i) => (
                <div className="sch-field" key={i}>
                  <label htmlFor={`sch-o${i}`}>
                    Option {i + 1} {i >= 2 && <em>(optional)</em>}
                    <em>{o.length} / 30</em>
                  </label>
                  <input id={`sch-o${i}`} type="text" name={`pollOption${i + 1}`} value={o} maxLength={30} onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} />
                </div>
              ))}
              <div className="sch-field">
                <label htmlFor="sch-d">Poll stays open for</label>
                <select id="sch-d" name="pollDuration" defaultValue="THREE_DAYS">
                  <option value="ONE_DAY">1 day</option>
                  <option value="THREE_DAYS">3 days</option>
                  <option value="SEVEN_DAYS">1 week</option>
                  <option value="FOURTEEN_DAYS">2 weeks</option>
                </select>
              </div>
            </div>
          )}

          {kind === "post" && (
            <div className="sch-field">
              <span className="sch-label">Image <em>(optional)</em></span>
              <div className="sch-file">
                <input type="file" name="file" accept="image/*" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
                {fileName && <span>{fileName}</span>}
              </div>
            </div>
          )}
          {kind === "document" && (
            <div className="sch-field">
              <span className="sch-label">PDF, PowerPoint or Word file</span>
              <div className="sch-file">
                <input type="file" name="file" accept=".pdf,.ppt,.pptx,.doc,.docx" required onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
                {fileName && <span>{fileName}</span>}
              </div>
            </div>
          )}
        </section>

        <section className="sch-step">
          <h3><span>4</span> When?</h3>
          <div className="sch-when">
            <div className="sch-seg" style={{ flex: "1 1 100%" }}>
              <button type="button" aria-pressed={mode === "now"} onClick={() => setMode("now")}>
                Post now<small>Goes out straight away</small>
              </button>
              <button type="button" aria-pressed={mode === "later"} onClick={() => { setMode("later"); if (!when) setWhen(londonLocal(3_600_000)); }}>
                Schedule for later<small>UK time, checked every 15 minutes</small>
              </button>
            </div>
          </div>
          {mode === "later" && (
            <div className="sch-field">
              <label htmlFor="sch-when">Date and time (UK)</label>
              <input id="sch-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              <div className="sch-chips">
                <button type="button" onClick={() => setWhen(londonLocal(15 * 60_000))}>In 15 minutes</button>
                <button type="button" onClick={() => setWhen(londonLocal(3_600_000))}>In 1 hour</button>
                <button type="button" onClick={() => setWhen(londonLocal(86_400_000, 9))}>Tomorrow 9:00</button>
                <button type="button" onClick={() => setWhen(londonLocal(nextMondayOffset(), 9))}>Next Monday 9:00</button>
              </div>
            </div>
          )}
        </section>

        <div className="sch-actions">
          <button type="submit" className="social-post-btn" disabled={busy || !canSend}>
            {busy ? "Saving…" : mode === "now" ? "Post now" : "Schedule it"}
          </button>
          {!canSend && !busy && <span className="social-format-hint">Add text and choose where it goes{kind === "poll" ? ", a question and two options" : ""}.</span>}
          {status && <span className={`social-compose-status ${status.ok ? "social-compose-success" : "social-compose-error"}`}>{status.text}</span>}
        </div>
      </form>

      <h3 className="sch-queue-head">Queue</h3>
      <p className="social-empty" style={{ textAlign: "left" }}>A post that fails is never retried automatically, so it can&apos;t go out twice.</p>
      {rows.length === 0 && <p className="social-empty">Nothing scheduled yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className="social-post-card">
          <div className="social-post-meta">
            <span>{new Date(r.run_at).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" })} (UK)</span>
            <span className={`sch-badge sch-badge-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
          </div>
          <p className="social-post-message">{r.body}</p>
          {r.poll && (
            <>
              <p className="social-post-message"><strong>{r.poll.question}</strong></p>
              <ul className="sch-poll-view">{r.poll.options.filter(Boolean).map((o) => <li key={o}>{o}</li>)}</ul>
            </>
          )}
          {r.media_name && <p className="social-empty" style={{ textAlign: "left" }}>Attached: {r.media_name}</p>}
          <div className="sch-tags">{r.targets.map((t) => <span key={t}>{TARGET_LABEL[t]}</span>)}</div>
          {r.results && Object.entries(r.results).map(([t, res]) => (
            <p key={t} className={res.ok ? "social-empty" : "social-compose-error"} style={{ textAlign: "left" }}>
              {TARGET_LABEL[t as Target] ?? t}: {res.ok ? <a href={res.url} target="_blank" rel="noreferrer">view the post</a> : res.error}
            </p>
          ))}
          {r.status === "pending" && <button type="button" className="social-comments-toggle" onClick={() => cancel(r.id)}>Cancel</button>}
        </div>
      ))}
    </div>
  );
}
