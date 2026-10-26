"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminRowData { id: string; email: string; owner: boolean; confirmed: boolean; you: boolean }

/// Add another admin by email (they are emailed a sign-in link) and remove admins other than yourself and the owner.
export default function AdminsManager({ admins, max }: { admins: AdminRowData[]; max: number }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/tapcard/biz/admins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (res?.ok) {
      setMessage({ text: `Added. We've emailed ${email.trim()} a sign-in link.`, ok: true });
      setEmail("");
      router.refresh();
    } else {
      setMessage({ text: data?.error ?? "Couldn't add the admin. Try again.", ok: false });
    }
  }

  async function remove(a: AdminRowData) {
    if (!window.confirm(`Remove ${a.email} as an admin? They will be signed out of the admin area straight away.`)) return;
    setBusy(true);
    const res = await fetch(`/api/tapcard/biz/admins?id=${encodeURIComponent(a.id)}`, { method: "DELETE" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (res?.ok) router.refresh();
    else window.alert(data?.error ?? "Couldn't remove the admin. Try again.");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-charcoal ring-1 ring-white/10">
        <div className="flex items-baseline justify-between px-4 pt-4">
          <h2 className="text-lg font-bold text-cloud">Admins</h2>
          <span className="text-sm text-mist">{admins.length} of {max}</span>
        </div>
        <ul className="mt-2 divide-y divide-slate/50">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-cloud">
              <div>
                <div>{a.email}{a.you ? " (you)" : ""}</div>
                <div className="text-sm text-mist">
                  {a.owner ? "Owner" : "Admin"}
                  {a.confirmed ? "" : " · hasn't signed in yet"}
                </div>
              </div>
              {!a.you && !a.owner && (
                <button type="button" onClick={() => remove(a)} disabled={busy} className="text-sm text-mist underline">Remove</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={add} className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Add an admin</h2>
        <p className="mt-1 text-sm text-mist">
          An admin can design the card template, invite and remove cards, choose who posts for which shop, see the numbers and manage billing.
          We email them a sign-in link. Use their work email: a card counts as verified when an admin has signed in with an email on the card&apos;s own website domain.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@yourcompany.com"
            className="min-w-0 flex-1 rounded-xl bg-slate/40 px-3 py-2 text-cloud"
            aria-label="Email address of the new admin"
          />
          <button type="submit" disabled={busy || !email.trim() || admins.length >= max} className="btn-gold rounded-xl px-4 py-2 font-semibold disabled:opacity-50">
            {busy ? "Adding…" : "Add admin"}
          </button>
        </div>
        {message && <p className={`mt-3 text-sm ${message.ok ? "text-cloud" : "text-gold"}`} role="status">{message.text}</p>}
        <p className="mt-3 text-sm text-mist">
          The owner is the person who signed up and can&apos;t be removed here. To hand the company to someone else, email{" "}
          <a href="mailto:enquiries@aiert.co.uk">enquiries@aiert.co.uk</a>.
        </p>
      </form>
    </div>
  );
}
