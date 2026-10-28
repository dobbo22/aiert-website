"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

interface Sign { headline: string; line: string; footer: string; showLogo: boolean; showSocials: boolean; showApp: boolean }
interface ShopItem { id: string; name: string; town: string; address: string; cardUrl: string | null; sign: Sign }
interface Company { name: string; website: string; logoUrl: string | null; socials: [string, string][] }

const handle = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/// The QR sign: edit on the left, the A4 sign as it will print on the right. A shop whose manager has not made the card yet shows a
/// SAMPLE sign (its QR points at the company website) so the layout and wording can be checked first.
export default function QrSignEditor({ shops, selected, company }: { shops: ShopItem[]; selected: string | null; company: Company }) {
  const [id, setId] = useState(selected);
  const [signs, setSigns] = useState<Record<string, Sign>>(() => Object.fromEntries(shops.map((s) => [s.id, s.sign])));
  const [qr, setQr] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const shop = shops.find((s) => s.id === id) ?? null;
  const sign = (id && signs[id]) || shops[0]?.sign || { headline: "Scan to follow and receive news and offers", line: "", footer: "Free TapCard app for iPhone and Android", showLogo: true, showSocials: false, showApp: true };
  const target = shop?.cardUrl ?? (company.website ? (/^https?:\/\//i.test(company.website) ? company.website : `https://${company.website}`) : "https://tapcard.aiert.co.uk");
  const sample = !shop?.cardUrl;

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(target, { margin: 1, width: 900, errorCorrectionLevel: "H" }).then((u) => { if (live) setQr(u); }).catch(() => {});
    return () => { live = false; };
  }, [target]);

  const set = (p: Partial<Sign>) => { if (id) setSigns((m) => ({ ...m, [id]: { ...sign, ...p } })); setNote(null); };
  const title = useMemo(() => sign.line.trim() || shop?.name || company.name, [sign.line, shop, company.name]);

  async function save() {
    if (!id) return;
    setSaving(true); setNote(null);
    const res = await fetch("/api/tapcard/biz/locations/sign", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, sign }) }).catch(() => null);
    setSaving(false);
    setNote(res?.ok ? "Saved for this shop." : "Couldn't save just now. Try again.");
  }

  if (!shops.length) {
    return (
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
        <h2 className="text-lg font-bold text-cloud">QR sign</h2>
        <p className="mt-1 text-sm text-mist">Add your shops first (Card template or Locations tab). Each shop gets its own sign with its own QR code.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          #qr-sign, #qr-sign * { visibility: visible !important; }
          #qr-sign { position: fixed; inset: 0; width: 210mm; height: 297mm; border-radius: 0 !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10 print:hidden">
        <h2 className="text-lg font-bold text-cloud">QR sign</h2>
        <p className="mt-1 text-sm text-mist">A sign for your window or till. Customers scan the QR code to save your card and follow your shop for news and offers.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {shops.map((s) => (
            <button key={s.id} type="button" onClick={() => { setId(s.id); setNote(null); }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${s.id === id ? "bg-gold text-black" : "text-cloud ring-1 ring-slate"}`}>{s.town}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="min-w-[18rem] flex-1 space-y-4 rounded-2xl bg-charcoal p-6 ring-1 ring-white/10 print:hidden">
          <label className="block">
            <span className="text-sm text-mist">Headline</span>
            <input value={sign.headline} maxLength={120} onChange={(e) => set({ headline: e.target.value })} className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
          </label>
          <label className="block">
            <span className="text-sm text-mist">Name on the sign</span>
            <input value={sign.line} maxLength={120} placeholder={shop?.name || company.name} onChange={(e) => set({ line: e.target.value })} className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
          </label>
          <label className="block">
            <span className="text-sm text-mist">Small print at the bottom</span>
            <input value={sign.footer} maxLength={120} onChange={(e) => set({ footer: e.target.value })} className="mt-1 w-full rounded-xl bg-slate/40 px-3 py-2 text-cloud ring-1 ring-slate" />
          </label>
          {([["showLogo", "Show the company logo", !!company.logoUrl], ["showSocials", "Show our social profiles", company.socials.length > 0], ["showApp", "Show the small print and TapCard line", true]] as const).map(([k, label, available]) => (
            <label key={k} className={`flex items-center gap-2 text-cloud ${available ? "" : "opacity-50"}`}>
              <input type="checkbox" checked={sign[k]} disabled={!available} onChange={(e) => set({ [k]: e.target.checked })} /> {label}
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="button" onClick={() => window.print()} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold">Print or save as PDF</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-cloud ring-1 ring-slate disabled:opacity-60">{saving ? "Saving…" : "Save wording"}</button>
          </div>
          {note && <p className="text-sm text-gold">{note}</p>}
          {sample && <p className="text-sm text-gold">This is a sample: the shop&apos;s card doesn&apos;t exist yet, so the QR code points to your website. The real QR code appears here once its manager has made the card.</p>}
          <p className="text-xs text-mist">In the print window choose A4, and turn off &quot;Headers and footers&quot; for the cleanest result.</p>
        </div>

        <div className="w-full max-w-[26rem] flex-1">
          <p className="mb-2 text-center text-sm font-semibold text-cloud print:hidden">Preview (A4)</p>
          <div id="qr-sign" className="relative mx-auto flex aspect-[210/297] w-full flex-col items-center overflow-hidden rounded-lg bg-white px-[8%] py-[7%] text-center text-black shadow-2xl ring-1 ring-white/20 [container-type:inline-size]">
            {sample && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[24cqw] font-black uppercase tracking-widest text-black/10 [transform:rotate(-30deg)]">Sample</div>}
            {sign.showLogo && company.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="max-h-[11%] max-w-[70%] object-contain" />
            )}
            <h1 className="mt-[4%] text-[9cqw] font-black leading-tight">{title}</h1>
            <p className="mt-[2%] text-[5.6cqw] font-semibold leading-snug">{sign.headline}</p>
            <div className="relative mt-[4%] w-[72%]">
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code" className="block w-full" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://www.aiert.co.uk/tapcard-icon.png" alt="" className="absolute left-1/2 top-1/2 h-[19%] w-[19%] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-1" />
            </div>
            {sign.showSocials && company.socials.length > 0 && (
              <ul className="mt-[3%] space-y-0.5 text-[3.2cqw] font-medium">
                {company.socials.map(([n, u]) => <li key={n}>{n}: {handle(u)}</li>)}
              </ul>
            )}
            {sign.showApp && (
              <div className="mt-auto pt-[3%]">
                <p className="text-[3.6cqw] font-semibold">{sign.footer}</p>
                <p className="text-[3cqw] text-black/60">TapCard from AIERT</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
