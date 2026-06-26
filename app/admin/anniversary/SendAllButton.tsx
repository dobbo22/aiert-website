"use client";

import { useState } from "react";

type Props = {
  recipients: { code: string; name: string }[];
};

export default function SendAllButton({ recipients }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [progress, setProgress] = useState({ sent: 0, failed: 0 });

  async function handleSendAll() {
    if (recipients.length === 0) return;
    const confirmed = window.confirm(
      `Send the invite email to all ${recipients.length} guests with an email on file?`
    );
    if (!confirmed) return;

    setState("sending");
    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      try {
        const res = await fetch("/api/admin/send-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: r.code }),
        });
        if (!res.ok) throw new Error("Failed");
        sent++;
      } catch {
        failed++;
      }
      setProgress({ sent, failed });
    }

    setState("done");
  }

  if (state === "done") {
    return (
      <span className="admin-sendall-done">
        Sent {progress.sent}/{recipients.length}
        {progress.failed ? `, ${progress.failed} failed` : ""}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="admin-sendall-btn"
      onClick={handleSendAll}
      disabled={state === "sending" || recipients.length === 0}
    >
      {state === "sending"
        ? `Sending… (${progress.sent}/${recipients.length})`
        : `Send Invite to All (${recipients.length})`}
    </button>
  );
}
