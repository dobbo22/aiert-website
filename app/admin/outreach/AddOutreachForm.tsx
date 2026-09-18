"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddOutreachForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [contact, setContact] = useState("");
  const [reach, setReach] = useState("");
  const [contentFocus, setContentFocus] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform, contact, reach, contentFocus, status: "Sent" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to add contact");
      }
      setName("");
      setPlatform("");
      setContact("");
      setReach("");
      setContentFocus("");
      setState("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
      setState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name / handle"
        style={{ flex: "1 1 160px", padding: "0.5rem" }}
      />
      <input
        type="text"
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        placeholder="Platform (e.g. TikTok, Email)"
        style={{ flex: "1 1 140px", padding: "0.5rem" }}
      />
      <input
        type="text"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Contact (email / link)"
        style={{ flex: "1 1 180px", padding: "0.5rem" }}
      />
      <input
        type="text"
        value={reach}
        onChange={(e) => setReach(e.target.value)}
        placeholder="Reach (e.g. 166K followers, 266K avg views)"
        style={{ flex: "1 1 220px", padding: "0.5rem" }}
      />
      <input
        type="text"
        value={contentFocus}
        onChange={(e) => setContentFocus(e.target.value)}
        placeholder="Content focus"
        style={{ flex: "1 1 200px", padding: "0.5rem" }}
      />
      <button type="submit" className="admin-invite-btn" disabled={state === "saving"}>
        {state === "saving" ? "Adding…" : "Add contact"}
      </button>
      {error && <p style={{ color: "red", width: "100%", margin: 0 }}>{error}</p>}
    </form>
  );
}
