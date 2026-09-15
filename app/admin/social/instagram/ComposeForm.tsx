"use client";

import { useRef, useState } from "react";
import { toStyledUnicode, type TextStyle } from "@/lib/unicodeStyle";
import type { InstagramMedia } from "@/lib/instagramGraph";

export default function ComposeForm({ onPosted }: { onPosted: (media: InstagramMedia) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
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
    const f = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setStatus({ ok: false, text: "Instagram requires an image — there's no text-only post." });
      return;
    }
    setSubmitting(true);
    setStatus(null);

    const caption = textareaRef.current?.value ?? "";

    try {
      setStatus({ ok: true, text: "Uploading image…" });
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const uploadRes = await fetch("/api/admin/social/upload", { method: "POST", body: uploadForm });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Upload failed");

      setStatus({ ok: true, text: "Publishing to Instagram…" });
      const postRes = await fetch("/api/admin/social/instagram/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, imageUrl: uploadJson.url }),
      });
      const postJson = await postRes.json();
      if (!postRes.ok) throw new Error(postJson.error ?? "Post failed");

      setStatus({ ok: true, text: "Posted to Instagram." });
      onPosted({
        id: postJson.postId,
        caption,
        media_url: uploadJson.url,
        permalink: `https://www.instagram.com/p/${postJson.postId}/`,
        timestamp: new Date().toISOString(),
        comments_count: 0,
      });
      formRef.current?.reset();
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : "Post failed" });
    }
    setSubmitting(false);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="social-compose">
      <div className="social-format-toolbar">
        <button type="button" onClick={() => applyStyle("bold")} title="Bold selected text (or whole caption)">
          <b>B</b>
        </button>
        <button type="button" onClick={() => applyStyle("italic")} title="Italicize selected text (or whole caption)">
          <i>I</i>
        </button>
        <span className="social-format-hint">Select text first, or leave nothing selected to style the whole caption</span>
      </div>
      <textarea ref={textareaRef} name="caption" placeholder="Write a caption for the MailBroom Instagram post…" required />

      {previewUrl && (
        <div className="social-compose-preview">
          <img src={previewUrl} alt="Selected image preview" />
          <button type="button" className="social-comments-toggle" onClick={clearImage}>
            Remove image
          </button>
        </div>
      )}

      <div className="social-compose-row">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} required />
        <button type="submit" className="social-post-btn" disabled={submitting}>
          {submitting ? "Posting…" : "Post to Instagram"}
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
