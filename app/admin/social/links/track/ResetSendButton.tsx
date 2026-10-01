"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Removes one invite (for one that bounced or went out by mistake), with its
// clicks, so the person shows as "Not invited yet" on the Send tab again.
export default function ResetSendButton({ sendId, name }: { sendId: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="invite-link-btn"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Reset this invite to ${name}? It's removed from these records and ${name} shows as not invited again.`)) return;
        setBusy(true);
        const res = await fetch("/api/admin/invites/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sendId }),
        });
        setBusy(false);
        if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "Couldn't reset that invite");
        router.refresh();
      }}
    >
      {busy ? "…" : "Reset"}
    </button>
  );
}
