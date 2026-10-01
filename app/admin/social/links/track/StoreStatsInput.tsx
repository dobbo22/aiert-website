"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Installs for one campaign token, copied in from App Store Connect / Play
// Console. Saves on blur or Enter.
export default function StoreStatsInput({
  campaignToken,
  store,
  initial,
}: {
  campaignToken: string;
  store: "appstore" | "play";
  initial?: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial != null ? String(initial) : "");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function save() {
    if (value === (initial != null ? String(initial) : "")) return;
    const installs = Number(value);
    if (!Number.isInteger(installs) || installs < 0) {
      setState("error");
      return;
    }
    setState("saving");
    const res = await fetch("/api/admin/invites/store-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignToken, store, installs }),
    });
    setState(res.ok ? "idle" : "error");
    if (res.ok) router.refresh();
  }

  return (
    <input
      className={`invite-installs ${state === "error" ? "invite-installs-error" : ""}`}
      inputMode="numeric"
      placeholder="—"
      value={value}
      disabled={state === "saving"}
      onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
