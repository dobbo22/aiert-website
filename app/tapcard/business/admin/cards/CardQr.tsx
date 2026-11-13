"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function CardQr({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  const link = `https://tapcard.aiert.co.uk/c/${id}?via=qr`;
  const [src, setSrc] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(link, { margin: 3, width: 1100, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }).then((u) => { if (live) setSrc(u); }).catch(() => {});
    return () => { live = false; };
  }, [link]);
  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <p className="text-sm font-semibold uppercase tracking-wider text-teal">{subtitle}</p>
      <h3 className="mt-1 text-lg font-bold text-cloud">{title}</h3>
      <div className="mt-4 flex items-start gap-4">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`QR code for ${title}`} className="h-40 w-40 rounded-xl bg-white" />
        ) : <div className="h-40 w-40 rounded-xl bg-white/10" />}
        <div className="space-y-2">
          <a href={src} download={`tapcard-${id}.png`} className="btn-gold inline-block rounded-xl px-4 py-2 font-semibold">Download QR code</a>
          <button type="button" className="block rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate"
            onClick={() => { navigator.clipboard?.writeText(`https://tapcard.aiert.co.uk/c/${id}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>{copied ? "Copied" : "Copy link"}</button>
          <a href={`/c/${id}?preview=1`} target="_blank" rel="noopener noreferrer" className="block text-gold underline">Open the card</a>
        </div>
      </div>
    </div>
  );
}
