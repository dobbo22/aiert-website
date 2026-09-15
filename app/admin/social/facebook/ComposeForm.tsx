"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ComposeForm() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmitting(true);
    setStatus(null);

    const res = await fetch("/api/admin/social/facebook/post", {
      method: "POST",
      body: new FormData(formRef.current),
    });
    const json = await res.json();

    if (res.ok) {
      setStatus({ ok: true, text: "Posted to Facebook." });
      formRef.current.reset();
      router.refresh();
    } else {
      setStatus({ ok: false, text: json.error ?? "Post failed" });
    }
    setSubmitting(false);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="social-compose">
      <textarea name="message" placeholder="Write a post for the MailBroom Facebook Page…" required />
      <div className="social-compose-row">
        <input type="file" name="image" accept="image/*" />
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
