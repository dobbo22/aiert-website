"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddReviewerForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/mailbroom/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, label }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add reviewer");
      }
      setEmail("");
      setLabel("");
      setState("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reviewer");
      setState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="reviewer@example.com — the address they'll connect in MailBroom"
        style={{ flex: "2 1 280px", padding: "0.5rem" }}
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Note (e.g. podcast/show name) — optional"
        style={{ flex: "1 1 200px", padding: "0.5rem" }}
      />
      <button type="submit" className="admin-invite-btn" disabled={state === "saving"}>
        {state === "saving" ? "Adding…" : "Add reviewer"}
      </button>
      {error && <p style={{ color: "red", width: "100%", margin: 0 }}>{error}</p>}
    </form>
  );
}
