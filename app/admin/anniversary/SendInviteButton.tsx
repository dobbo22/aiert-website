"use client";

import { useState } from "react";

type Props = {
  code: string;
  hasEmail: boolean;
  alreadySent: boolean;
  accepted: boolean;
  whatsappConfirmed: boolean;
};

export default function SendInviteButton({ code, hasEmail, alreadySent, accepted, whatsappConfirmed }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSend() {
    setState("sending");
    try {
      const res = await fetch("/api/admin/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error("Failed");
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (accepted) {
    return (
      <button type="button" className="admin-invite-btn admin-invite-ghosted" onClick={handleSend} disabled={!hasEmail}>
        {state === "sending" ? "Sending…" : "Accepted ✓"}
      </button>
    );
  }

  if (state === "sent" || (alreadySent && state === "idle")) {
    return (
      <button type="button" className="admin-invite-btn admin-invite-ghosted" onClick={handleSend} disabled={!hasEmail}>
        Sent ✓
      </button>
    );
  }

  if (whatsappConfirmed && state === "idle") {
    return (
      <button type="button" className="admin-invite-btn admin-invite-ghosted" onClick={handleSend} disabled={!hasEmail}>
        Sent via WhatsApp
      </button>
    );
  }

  if (!hasEmail) {
    return <span className="admin-invite-disabled">No email</span>;
  }

  return (
    <button type="button" className="admin-invite-btn" onClick={handleSend} disabled={state === "sending"}>
      {state === "sending" ? "Sending…" : state === "error" ? "Retry" : "Send Invite"}
    </button>
  );
}
