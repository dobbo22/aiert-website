"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminRowData { id: string; email: string; owner: boolean; confirmed: boolean; you: boolean }

/// Add another admin by email (they are emailed a sign-in link) and remove admins other than yourself and the owner.
export interface ManagerRowData { id: string; email: string; confirmed: boolean; locationIds: string[]; canPost: boolean }
export interface ShopOption { id: string; label: string }

export default function AdminsManager({ admins, max, managers, maxManagers, shops }: { admins: AdminRowData[]; max: number; managers: ManagerRowData[]; maxManagers: number; shops: ShopOption[] }) {
  const [mEmail, setMEmail] = useState("");
  const [mShops, setMShops] = useState<string[]>([]);
  const [mMessage, setMMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function addManager(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMMessage(null);
    const res = await fetch("/api/tapcard/biz/admins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: mEmail, role: "manager", locationIds: mShops }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (res?.ok) { setMMessage({ text: `Added. We've emailed ${mEmail.trim()} what they can do and a sign-in link.`, ok: true }); setMEmail(""); setMShops([]); router.refresh(); }
    else setMMessage({ text: data?.error ?? "Couldn't add the manager. Try again.", ok: false });
  }

  async function changeShops(m: ManagerRowData, ids: string[]) {
    if (!ids.length) { window.alert("A manager needs at least one shop."); return; }
    setBusy(true);
    await fetch("/api/tapcard/biz/admins", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: m.id, locationIds: ids }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  }

  async function togglePost(m: ManagerRowData, canPost: boolean) {
    setBusy(true);
    await fetch("/api/tapcard/biz/admins", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: m.id, canPost }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  }

  async function removeManager(m: ManagerRowData) {
    if (!window.confirm(`Remove ${m.email} as a manager? They will be signed out straight away.`)) return;
    setBusy(true);
    await fetch(`/api/tapcard/biz/admins?id=${encodeURIComponent(m.id)}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    router.refresh();
  }

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

      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Managers</h2>
        <p className="mt-1 text-sm text-mist">
          A manager looks after one or more shops. They sign in with an emailed link and can print their shop&apos;s QR sign and create or remove
          their shop&apos;s staff cards. They can post their shop&apos;s offers and news unless you switch that off for them below. They never see billing, the template, locations or other admins.
        </p>
        {managers.length > 0 && (
          <ul className="mt-4 divide-y divide-slate/50">
            {managers.map((m) => (
              <li key={m.id} className="py-3 text-cloud">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div>{m.email}</div>
                    <div className="text-sm text-mist">Manager{m.confirmed ? "" : " · hasn't signed in yet"}</div>
                  </div>
                  <button type="button" onClick={() => removeManager(m)} disabled={busy} className="text-sm text-mist underline">Remove</button>
                </div>
                <label className="mt-2 flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={m.canPost} disabled={busy} onChange={(e) => void togglePost(m, e.target.checked)} />
                  May post offers and news for their shops
                </label>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {shops.map((sh) => (
                    <label key={sh.id} className="flex items-center gap-1.5">
                      <input type="checkbox" checked={m.locationIds.includes(sh.id)} disabled={busy}
                        onChange={(e) => changeShops(m, e.target.checked ? [...m.locationIds, sh.id] : m.locationIds.filter((x) => x !== sh.id))} />
                      {sh.label}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addManager} className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="email" required value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="manager@yourcompany.com"
              className="min-w-0 flex-1 rounded-xl bg-slate/40 px-3 py-2 text-cloud" aria-label="Email address of the new manager" />
            <button type="submit" disabled={busy || !mEmail.trim() || mShops.length === 0 || managers.length >= maxManagers} className="btn-gold rounded-xl px-4 py-2 font-semibold disabled:opacity-50">Add manager</button>
          </div>
          {shops.length === 0 ? (
            <p className="mt-3 text-sm text-gold">Add your shops first (Card template or Locations tab), then choose which ones this manager looks after.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-cloud">
              <span className="text-mist">Looks after:</span>
              {shops.map((sh) => (
                <label key={sh.id} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={mShops.includes(sh.id)} onChange={(e) => setMShops((l) => (e.target.checked ? [...l, sh.id] : l.filter((x) => x !== sh.id)))} />
                  {sh.label}
                </label>
              ))}
            </div>
          )}
          {mMessage && <p className={`mt-3 text-sm ${mMessage.ok ? "text-cloud" : "text-gold"}`} role="status">{mMessage.text}</p>}
        </form>
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
