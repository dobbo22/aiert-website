"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminAction({ label, body, danger }: { label: string; body: Record<string, unknown>; danger?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    await fetch("/api/admin/tapcard/verifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    router.refresh();
  }
  return (
    <button type="button" onClick={run} disabled={busy} style={{ border: "1px solid rgba(255,255,255,.3)", borderRadius: 8, padding: "2px 10px", marginRight: 8, color: danger ? "#fca5a5" : "inherit" }}>
      {busy ? "…" : label}
    </button>
  );
}
