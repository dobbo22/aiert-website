"use client";

import { useRef, useState } from "react";
import { toStyledUnicode, type TextStyle } from "@/lib/unicodeStyle";
import type { FacebookPost } from "@/lib/facebookGraph";

export default function ComposeForm({ onPosted }: { onPosted: (post: FacebookPost) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmitting(true);
    setStatus(null);

    const message = textareaRef.current?.value ?? "";
    const usedPreviewUrl = previewUrl;

    const res = await fetch("/api/admin/social/facebook/post", {
      method: "POST",
      body: new FormData(formRef.current),
    });
    const json = await res.json();

    if (res.ok) {
      setStatus({ ok: true, text: "Posted to Facebook." });
      onPosted({
        id: json.postId,
        message,
        created_time: new Date().toISOString(),
        permalink_url: `https://www.facebook.com/${json.postId}`,
        full_picture: usedPreviewUrl ?? undefined,
        comments: { summary: { total_count: 0 } },
      });
      formRef.current.reset();
      // Don't revoke usedPreviewUrl — the post card above now owns that blob URL.
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setStatus({ ok: false, text: json.error ?? "Post failed" });
    }
    setSubmitting(false);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="social-compose">
      <div className="social-format-toolbar">
        <button type="button" onClick={() => applyStyle("bold")} title="Bold selected text (or whole post)">
          <b>B</b>
        </button>
        <button type="button" onClick={() => applyStyle("italic")} title="Italicize selected text (or whole post)">
          <i>I</i>
        </button>
        <span className="social-format-hint">Select text first, or leave nothing selected to style the whole post</span>
      </div>
      <textarea ref={textareaRef} name="message" placeholder="Write a post for the MailBroom Facebook Page…" required />

      {previewUrl && (
        <div className="social-compose-preview">
          <img src={previewUrl} alt="Selected image preview" />
          <button type="button" className="social-comments-toggle" onClick={clearImage}>
            Remove image
          </button>
        </div>
      )}

      <div className="social-compose-row">
        <input ref={fileInputRef} type="file" name="image" accept="image/*" onChange={handleFileChange} />
        <button type="submit" className="social-post-btn" disabled={submitting}>
          {submitting ? "Posting…" : "Post to Facebook"}
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
