"use client";

import { useState } from "react";

/// An employee's photo on the employees page: tap the circle to upload or
/// replace it (app/api/tapcard/biz/employees/[id]/photo). It becomes their
/// card photo when they claim — employees can still change it in the app.
export default function EmployeePhoto({ employeeId, name, initialUrl }: { employeeId: string; name: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tapcard/biz/employees/${encodeURIComponent(employeeId)}/photo`, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Couldn't save the photo.");
      else setUrl(data.url ?? null);
    } catch {
      setError("Couldn't save the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label
        className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate/60 text-xs text-mist ring-1 ring-slate ${busy ? "opacity-50" : ""}`}
        title={url ? `Change ${name}'s photo` : `Add a photo for ${name}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>+</span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const form = new FormData();
            form.append("photo", file);
            void send({ method: "POST", body: form });
          }}
        />
      </label>
      {url && !busy && (
        <button type="button" onClick={() => send({ method: "DELETE" })} className="text-xs text-mist underline">
          remove
        </button>
      )}
      {error && <span className="text-xs text-gold">{error}</span>}
    </div>
  );
}
