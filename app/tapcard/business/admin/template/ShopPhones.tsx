"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import QRCode from "qrcode";
import { CardFace, Phone } from "../../../demo/Phones";
import { rowsFor } from "../../../demo/DemoBuilder";
import { enrichPlace } from "../placeClient";

export interface ShopLink { kind: string; label: string; value: string }
export interface Shop {
  key: string; id?: string; name: string; address: string; phone: string; email: string; website: string; hours: string;
  links: ShopLink[]; claimed: boolean; cardId?: string | null; source?: string;
}
export interface Socials { linkedIn: string; twitter: string; instagram: string; facebook: string; tiktok: string }
export interface Hit { id: string; name: string; address: string; website: string; phone: string; type?: string; hours: string }
export interface ShopHandle { addFromHit: (hit: Hit) => Promise<void> }

const postcode = (a: string) => (a.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i)?.[0] ?? "").replace(/\s+/g, "").toLowerCase();
const same = (a: Shop, b: { address: string; phone: string }) => {
  const pa = postcode(a.address), pb = postcode(b.address);
  return pa && pb ? pa === pb : !!a.phone && a.phone.replace(/\D/g, "") === b.phone.replace(/\D/g, "");
};
/// Just the town on the tab (the shop's name is the same for every shop): "Great Dunmow", not the whole address.
function tabLabel(s: Shop): string {
  const parts = s.address.split(",").map((p) => p.replace(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i, "").trim()).filter(Boolean);
  const town = parts.length >= 2 ? parts[1] : parts[0] ?? "";
  return town || s.name || "New shop";
}

/// The shops as the app shows them: a phone screen for each, in tabs. A found shop is previewed until it is added; an added shop can be
/// edited until its manager makes the card (then the manager owns it). Built from the same lookup the apps use.
const ShopPhones = forwardRef<ShopHandle, { initial: Shop[]; allowed: number; website: string; socials: Socials; logoUrl: string | null }>(function ShopPhones({ initial, allowed, website, socials, logoUrl }, ref) {
  const [shops, setShops] = useState<Shop[]>(initial);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [qr, setQr] = useState("");

  const savedCount = (list: Shop[]) => list.filter((s) => s.id).length;

  async function save(picked: { name: string; address: string; phone: string; website: string; hours: string }): Promise<Shop | null> {
    // A shop found on Apple Maps has only a name and address: one lookup fills in its phone, website and hours as it is added.
    const hit = await enrichPlace({ id: "", type: "", ...picked });
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
  function addManually() {
    const blank: Shop = { key: `manual-${Date.now()}`, name: shops[0]?.name ?? "", address: "", phone: "", email: "", website, hours: "", links: [], claimed: false, source: "typed" };
    setShops((l) => [...l, blank]);
    setSel(shops.length);
    setNote("Type the shop's details, then press Add this shop. Its opening hours and links are read from your website.");
  }
  const qrText = (shop?.website || website || "https://tapcard.aiert.co.uk").replace(/^(?!https?:\/\/)/i, "https://");
  // A sample QR (the shop's website): the real one, for the shop's own card link, exists once its manager makes the card.
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(qrText, { margin: 1, width: 240, errorCorrectionLevel: "H" }).then((u) => { if (live) setQr(u); }).catch(() => {});
    return () => { live = false; };
  }, [qrText]);
  const patch = (p: Partial<Shop>) => setShops((l) => l.map((s, i) => (i === sel ? { ...s, ...p } : s)));

  async function saveEdits() {
    if (!shop?.id) return;
    setBusy(true); setNote(null);
    const res = await fetch("/api/tapcard/biz/locations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: shop.id, name: shop.name, address: shop.address, phone: shop.phone, email: shop.email }) }).catch(() => null);
    setBusy(false);
    setNote(res?.ok ? (shop.claimed ? "Saved. The card is updated now for customers; the manager's app picks it up too." : "Saved.") : "Couldn't save that. Try again.");
  }

  async function addThis() {
    if (!shop || shop.id) return;
    setBusy(true); setNote(null);
    const made = await save(shop);
    if (made) setShops((l) => l.map((s, i) => (i === sel ? made : s)));
    setBusy(false);
  }

  async function removeCard() {
    if (!shop?.cardId || !window.confirm(`Remove the card for ${tabLabel(shop)}? Its link, QR code and Wallet pass will stop working, and its manager loses it.`)) return;
    setBusy(true);
    const res = await fetch(`/api/tapcard/biz/cards/${encodeURIComponent(shop.cardId)}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    // The shop stays, waiting for its manager again: create a new invite link on the Locations tab.
    if (res?.ok) { setShops((l) => l.map((s, i) => (i === sel ? { ...s, claimed: false, cardId: null } : s))); setNote("Card removed. The shop is waiting for its manager again: create a new link for it on the Locations tab."); }
    else setNote("Couldn't remove that card. Try again.");
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
        <button type="button" onClick={addManually} className="mt-4 rounded-xl px-3 py-2 text-sm font-semibold text-gold ring-1 ring-gold">+ Add a shop manually</button>
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
      <div className="mt-3 flex gap-3 overflow-x-auto px-1 py-2">
        {shops.map((s, i) => (
          <button key={s.key} type="button" onClick={() => { setSel(i); setNote(null); }}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${i === sel ? "bg-gold text-black" : "text-cloud ring-1 ring-slate"} ${s.id ? "" : "border border-dashed border-mist"}`}>
            {s.id ? "" : "+ "}{tabLabel(s)}
          </button>
        ))}
        <button type="button" onClick={addManually} className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-gold ring-1 ring-gold">+ Add a shop manually</button>
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-8">
        <Phone large label={shop.id ? (shop.claimed ? "Card made" : "Added, waiting for its manager") : "Found, not added yet"}>
          <CardFace name={shop.name} kind="Business" typed="" stage={3} rows={rows.filter((r) => !r.social)} socials={rows.filter((r) => r.social)} interactive={false} domain={domain} onOpen={() => {}} logoSrc={logoUrl} noFavicon />
          <div className="space-y-3 px-4 pb-8">
            <p className="w-full rounded-2xl bg-blue-500 py-3 text-center text-sm font-semibold">▦ Share my card</p>
            {qr && (
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code" className="mx-auto h-44 w-44 rounded-lg bg-white p-2" />
                <p className="mt-2 text-xs font-semibold">Scan to get my card</p>
                <p className="mt-0.5 text-[10px] text-white/70">TapCard from AIERT</p>
              </div>
            )}
          </div>
        </Phone>
        <div className="min-w-[16rem] flex-1 space-y-3">
          {([["name", "Shop name"], ["address", "Address"], ["phone", "Phone"], ["email", "Email"]] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="text-sm text-mist">{label}</span>
              <input value={shop[k]} onChange={(e) => patch({ [k]: e.target.value })} 
                className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!shop.id && <button type="button" onClick={() => void addThis()} disabled={busy || savedCount(shops) >= allowed} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">Add this shop</button>}
            {shop.id && <button type="button" onClick={() => void saveEdits()} disabled={busy} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">Save changes</button>}
            {shop.id && !shop.claimed && <button type="button" onClick={() => void removeThis()} className="text-sm text-mist underline">Remove</button>}
            {shop.claimed && shop.cardId && <button type="button" onClick={() => void removeCard()} className="text-sm text-mist underline">Remove this card</button>}
            {shop.id && <a href={`/business/admin/qr-sign?shop=${shop.id}`} className="text-sm font-semibold text-gold underline">QR sign</a>}
            {shop.id && !shop.claimed && <a href="/business/admin/locations" className="text-sm font-semibold text-gold underline">Invite its manager</a>}
          </div>
          {!shop.id && savedCount(shops) >= allowed && <p className="text-sm text-gold">Your plan has {allowed} location{allowed === 1 ? "" : "s"}, all added. Change the number on the Billing tab to add more.</p>}
          {note && <p className="text-sm text-gold">{note}</p>}
        </div>
      </div>
    </div>
  );
});

export default ShopPhones;
