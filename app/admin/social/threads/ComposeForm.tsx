"use client";

import { useRef, useState } from "react";
import { toStyledUnicode, type TextStyle } from "@/lib/unicodeStyle";
import type { ThreadsPost } from "@/lib/threadsGraph";

const MAX_LENGTH = 500;

export default function ComposeForm({ onPosted }: { onPosted: (post: ThreadsPost) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyStyle(style: TextStyle) {
    const el = textareaRef.current;
    if (!el) return;
    const hasSelection = el.selectionStart !== el.selectionEnd;
    const start = hasSelection ? el.selectionStart : 0;
    const end = hasSelection ? el.selectionEnd : el.value.length;
    const styled = toStyledUnicode(el.value.slice(start, end), style);
    el.value = el.value.slice(0, start) + styled + el.value.slice(end);
    el.focus();
    const caret = start + styled.length;
    el.setSelectionRange(caret, caret);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = textareaRef.current?.value.trim() ?? "";
    if (!text) return;
    if (text.length > MAX_LENGTH) {
      setStatus({ ok: false, text: `Thread is ${text.length} characters — Threads' limit is ${MAX_LENGTH}.` });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const res = await fetch("/api/admin/social/threads/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();

    if (res.ok) {
      setStatus({ ok: true, text: "Posted to Threads." });
      onPosted({
        id: json.postId,
        text,
        permalink: `https://www.threads.net/@mailbroom/post/${json.postId}`,
        timestamp: new Date().toISOString(),
      });
      if (textareaRef.current) textareaRef.current.value = "";
    } else {
      setStatus({ ok: false, text: json.error ?? "Post failed" });
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="social-compose">
      <div className="social-format-toolbar">
        <button type="button" onClick={() => applyStyle("bold")} title="Bold selected text (or whole thread)">
          <b>B</b>
        </button>
        <button type="button" onClick={() => applyStyle("italic")} title="Italicize selected text (or whole thread)">
          <i>I</i>
        </button>
        <span className="social-format-hint">Select text first, or leave nothing selected to style the whole thread</span>
      </div>
      <textarea ref={textareaRef} placeholder="Write a thread for the MailBroom Threads account…" required />
      <div className="social-compose-row">
        <button type="submit" className="social-post-btn" disabled={submitting}>
          {submitting ? "Posting…" : "Post to Threads"}
        </button>
      </div>
      {status && (
        <p className={`social-compose-status ${status.ok ? "social-compose-success" : "social-compose-error"}`}>
          {status.text}
        </p>
      )}
    </form>
  );
}
