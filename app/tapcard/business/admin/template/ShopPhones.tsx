"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { CardFace, Phone } from "../../../demo/Phones";
import { rowsFor } from "../../../demo/DemoBuilder";

export interface ShopLink { kind: string; label: string; value: string }
export interface Shop {
  key: string; id?: string; name: string; address: string; phone: string; email: string; website: string; hours: string;
  links: ShopLink[]; claimed: boolean; source?: string;
}
export interface Socials { linkedIn: string; twitter: string; instagram: string; facebook: string; tiktok: string }
export interface Hit { id: string; name: string; address: string; website: string; phone: string; type?: string; hours: string }
export interface ShopHandle { addFromHit: (hit: Hit) => Promise<void> }

const postcode = (a: string) => (a.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i)?.[0] ?? "").replace(/\s+/g, "").toLowerCase();
const same = (a: Shop, b: { address: string; phone: string }) => {
  const pa = postcode(a.address), pb = postcode(b.address);
  return pa && pb ? pa === pb : !!a.phone && a.phone.replace(/\D/g, "") === b.phone.replace(/\D/g, "");
};
function tabLabel(s: Shop): string {
  const parts = s.address.split(",").map((p) => p.trim()).filter(Boolean);
  const town = parts.length >= 2 ? parts[parts.length - 2].replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim() || parts[0] : parts[0] ?? "";
  return town ? `${s.name} · ${town}` : s.name;
}

/// The shops as the app shows them: a phone screen for each, in tabs. A found shop is previewed until it is added; an added shop can be
/// edited until its manager makes the card (then the manager owns it). Built from the same lookup the apps use.
const ShopPhones = forwardRef<ShopHandle, { initial: Shop[]; allowed: number; website: string; socials: Socials; logoUrl: string | null }>(function ShopPhones({ initial, allowed, website, socials, logoUrl }, ref) {
  const [shops, setShops] = useState<Shop[]>(initial);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const savedCount = (list: Shop[]) => list.filter((s) => s.id).length;

  async function save(hit: { name: string; address: string; phone: string; website: string; hours: string }): Promise<Shop | null> {
    const res = await fetch("/api/tapcard/biz/locations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hit }) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string; location?: Shop & { id: string } } | null;
    if (res?.ok && data?.location) return { ...data.location, key: data.location.id, hours: "", claimed: false };
    setNote(data?.error ?? "Couldn't add that shop. Try again.");
    return null;
  }

  async function addFromHit(hit: Hit) {
    setBusy(true); setNote("Building the card from Google and the website…");
    let list = shops;
    let index = list.findIndex((s) => same(s, hit));
    if (index < 0 && savedCount(list) < allowed) {
      const made = await save(hit);
      if (made) { list = [...list.filter((s) => s.id || !same(s, hit)), made]; index = list.length - 1; }
    }
    setShops(list);
    if (index >= 0) setSel(index);
    // The company's other shops, found automatically, shown as further tabs.
    const res = await fetch("/api/tapcard/biz/locations/discover", { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { candidates?: (Hit & { source: string })[] } | null;
    const extra: Shop[] = (data?.candidates ?? []).filter((c) => !list.some((s) => same(s, c))).map((c) => ({
      key: c.id, name: c.name, address: c.address, phone: c.phone, email: "", website: c.website, hours: c.hours, links: [], claimed: false, source: c.source,
    }));
    setShops([...list, ...extra]);
    setBusy(false);
    setNote(extra.length ? `Found ${extra.length} more shop${extra.length === 1 ? "" : "s"}: open their tabs and add the ones you want.` : null);
  }
  useImperativeHandle(ref, () => ({ addFromHit }));

  const shop = shops[sel];
  const patch = (p: Partial<Shop>) => setShops((l) => l.map((s, i) => (i === sel ? { ...s, ...p } : s)));

  async function saveEdits() {
    if (!shop?.id) return;
    setBusy(true); setNote(null);
    const res = await fetch("/api/tapcard/biz/locations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: shop.id, name: shop.name, address: shop.address, phone: shop.phone, email: shop.email }) }).catch(() => null);
    setBusy(false);
    setNote(res?.ok ? "Saved." : "Couldn't save that. Its card may already have been made.");
  }

  async function addThis() {
    if (!shop || shop.id) return;
    setBusy(true); setNote(null);
    const made = await save(shop);
    if (made) setShops((l) => l.map((s, i) => (i === sel ? made : s)));
    setBusy(false);
  }

  async function removeThis() {
    if (!shop?.id || !window.confirm(`Remove ${shop.name}? You can add it again.`)) return;
    const res = await fetch(`/api/tapcard/biz/locations?id=${encodeURIComponent(shop.id)}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) { setShops((l) => l.filter((_, i) => i !== sel)); setSel(0); }
  }

  if (!shops.length) {
    return (
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">Your shops</h2>
        <p className="mt-1 text-sm text-mist">Find your business above and its card appears here as a phone screen, with your other shops in tabs.</p>
        {busy && <p className="mt-3 text-sm text-gold">{note}</p>}
      </div>
    );
  }

  const domain = (() => { try { return new URL(/^https?:\/\//i.test(shop.website || website) ? (shop.website || website) : `https://${shop.website || website}`).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const links = [...shop.links];
  if (shop.hours && !links.some((l) => l.kind === "hours")) links.push({ kind: "hours", label: "Opening hours", value: shop.hours });
  const rows = rowsFor({
    name: shop.name, website: shop.website || website, address: shop.address, phone: shop.phone, links,
    facebookUrl: socials.facebook, instagramUrl: socials.instagram, twitterUrl: socials.twitter, linkedInUrl: socials.linkedIn, tiktokUrl: socials.tiktok, branchCount: 0,
  });

  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-bold text-cloud">Your shops</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {shops.map((s, i) => (
          <button key={s.key} type="button" onClick={() => { setSel(i); setNote(null); }}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${i === sel ? "bg-gold text-black" : "text-cloud ring-1 ring-slate"} ${s.id ? "" : "border border-dashed border-mist"}`}>
            {s.id ? "" : "+ "}{tabLabel(s)}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-8">
        <Phone label={shop.id ? (shop.claimed ? "Card made" : "Added, waiting for its manager") : "Found, not added yet"}>
          <CardFace name={shop.name} kind="Business" typed="" stage={3} rows={rows.filter((r) => !r.social)} socials={rows.filter((r) => r.social)} interactive={false} domain={domain} onOpen={() => {}} logoSrc={logoUrl} />
        </Phone>
        <div className="min-w-[16rem] flex-1 space-y-3">
          {([["name", "Shop name"], ["address", "Address"], ["phone", "Phone"], ["email", "Email"]] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="text-sm text-mist">{label}</span>
              <input value={shop[k]} onChange={(e) => patch({ [k]: e.target.value })} disabled={shop.claimed}
                className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate disabled:opacity-60" />
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!shop.id && <button type="button" onClick={() => void addThis()} disabled={busy || savedCount(shops) >= allowed} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">Add this shop</button>}
            {shop.id && !shop.claimed && <button type="button" onClick={() => void saveEdits()} disabled={busy} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">Save changes</button>}
            {shop.id && !shop.claimed && <button type="button" onClick={() => void removeThis()} className="text-sm text-mist underline">Remove</button>}
            {shop.id && <a href="/business/admin/locations" className="text-sm font-semibold text-gold underline">Invite its manager</a>}
          </div>
          {!shop.id && savedCount(shops) >= allowed && <p className="text-sm text-gold">Your plan has {allowed} location{allowed === 1 ? "" : "s"}, all added. Change the number on the Billing tab to add more.</p>}
          {note && <p className="text-sm text-gold">{note}</p>}
        </div>
      </div>
    </div>
  );
});

export default ShopPhones;
