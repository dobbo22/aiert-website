"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/// A QR code for an invite link, so a phone with no email set up can open it by scanning the screen with its camera. Shown on request.
export default function LinkQr({ link }: { link: string }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!open) return;
    let live = true;
    QRCode.toDataURL(link, { margin: 4, width: 1100, errorCorrectionLevel: "L", color: { dark: "#000000", light: "#ffffff" } }).then((u) => { if (live) setSrc(u); }).catch(() => {});
    return () => { live = false; };
  }, [open, link]);
  return (
    <span>
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-xl px-4 py-2 font-semibold text-cloud ring-1 ring-slate">{open ? "Hide QR code" : "Show QR code"}</button>
      {open && (
        <span className="mt-3 block">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="QR code for the invite link" className="aspect-square w-full max-w-[34rem] rounded-xl bg-white" />
          ) : <span className="text-sm text-mist">Making the QR code…</span>}
          <span className="mt-2 block text-sm text-mist">Hold the phone about 20 to 30 cm from the screen with the screen brightness turned up, and keep the whole code in view. It opens the link, so no email is needed on the phone. The link works once.</span>
        </span>
      )}
    </span>
  );
}
