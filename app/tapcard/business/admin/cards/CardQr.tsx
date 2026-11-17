"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/// The QR picture with a line of words printed under it (for an event sign): white page, code, then the words wrapped and centred.
function withCaption(qr: string, caption: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width, pad = Math.round(w * 0.06), size = Math.round(w * 0.055), lineH = Math.round(size * 1.35);
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      if (!ctx) { resolve(qr); return; }
      ctx.font = `700 ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
      const lines: string[] = [];
      let line = "";
      for (const word of caption.split(" ")) {
        const t = line ? `${line} ${word}` : word;
        if (ctx.measureText(t).width > w - pad * 2 && line) { lines.push(line); line = word; } else line = t;
      }
      if (line) lines.push(line);
      c.width = w;
      c.height = img.height + pad + lines.length * lineH + pad;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.font = `700 ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
      lines.forEach((l, i) => ctx.fillText(l, w / 2, img.height + pad / 2 + (i + 1) * lineH));
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(qr);
    img.src = qr;
  });
}

export default function CardQr({ id, title, subtitle, eventCode, caption }: { id: string; title: string; subtitle: string; eventCode?: string; caption?: string }) {
  // An event code rides in the link, so each follow can be tagged with the meeting or event it came from.
  const link = `https://tapcard.aiert.co.uk/c/${id}?via=qr${eventCode ? `&e=${eventCode}` : ""}`;
  const [src, setSrc] = useState("");
  const [printSrc, setPrintSrc] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(link, { margin: 3, width: 1100, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }).then(async (u) => { if (!live) return; setSrc(u); if (caption) { const p = await withCaption(u, caption); if (live) setPrintSrc(p); } }).catch(() => {});
    return () => { live = false; };
  }, [link, caption]);
  return (
    <div className="rounded-2xl bg-charcoal p-6 ring-1 ring-white/10">
      <p className="text-sm font-semibold uppercase tracking-wider text-teal">{subtitle}</p>
      <h2 className="mt-1 text-lg font-bold text-cloud">{title}</h2>
      <div className="mt-4 flex items-start gap-4">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`QR code for ${title}`} className="h-40 w-40 rounded-xl bg-white" />
        ) : <div className="h-40 w-40 rounded-xl bg-white/10" />}
        <div className="space-y-2">
          <a href={printSrc || src} download={`tapcard-${eventCode ? "event-" + eventCode : id}.png`} className="btn-gold inline-block rounded-xl px-4 py-2 font-semibold">{caption ? "Download QR code with wording" : "Download QR code"}</a>
          <button type="button" className="block rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate"
            onClick={() => { navigator.clipboard?.writeText(eventCode ? `https://tapcard.aiert.co.uk/c/${id}?e=${eventCode}` : `https://tapcard.aiert.co.uk/c/${id}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>{copied ? "Copied" : "Copy link"}</button>
          <a href={`/c/${id}?preview=1`} target="_blank" rel="noopener noreferrer" className="block text-gold underline">Open the card</a>
        </div>
      </div>
      {caption && <p className="mt-3 text-center text-sm font-semibold text-cloud">{caption}</p>}
    </div>
  );
}
